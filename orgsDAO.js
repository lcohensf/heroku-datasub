var pg = require('pg'),
	strftime = require('strftime'),
	fs = require("fs"),
	sf = require('node-salesforce'),
	jwt = require('jwt-simple');

var pgcryptoinsert = 'INSERT INTO oauth("org_id", "sandbox", "uname", "pw") '
	+ 'SELECT vals.org_id, vals.sandbox, pgp_pub_encrypt(vals.uname, keys.pubkey) as uname, '
	+ 'pgp_pub_encrypt(vals.pw, keys.pubkey) as pw '
	+ 'FROM (VALUES ($1, $2, $3, $4)) as vals(org_id, sandbox, uname, pw) '
	+ 'CROSS JOIN (SELECT dearmor($5) as pubkey) as keys';
				
var noncryptoinsert = 	'INSERT INTO oauth (org_id, sandbox, uname, pw) VALUES ($1, $2, $3, $4)';

var pgcryptoselect = 'SELECT oauth.org_id, oauth.sandbox, pgp_pub_decrypt(oauth.uname, keys.privkey) as uname_decrypt, '
		+ 'pgp_pub_decrypt(oauth.pw, keys.privkey) as pw_decrypt '
		+ 'FROM oauth CROSS JOIN (SELECT dearmor($2) as privkey) as keys where oauth.org_id = $1';
		
var noncryptoselect = 	'SELECT org_id, sandbox, uname, pw FROM oauth where org_id = $1';

var pgcryptoselectall = 'SELECT oauth.org_id, oauth.sandbox, pgp_pub_decrypt(oauth.uname, keys.privkey) as uname_decrypt, '
		+ 'pgp_pub_decrypt(oauth.pw, keys.privkey) as pw_decrypt '
		+ 'FROM oauth CROSS JOIN (SELECT dearmor($2) as privkey) as keys';
		
var noncryptoselectall = 	'SELECT org_id, sandbox, uname, pw FROM oauth';

var jwtSecret = process.env.JWTSecret || 'N3c8h3h7ljzzap56tsuxMw';
var localmode = true;
var pubkey = '';
var privkey = '';

function OrgsDAO(pgConnectionString) {

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof OrgsDAO)) {
        console.log('Warning: OrgsDAO constructor called without "new" operator');
        return new OrgsDAO(pgConnectionString);
    }
     
    localmode = pgConnectionString.search('localhost') != -1;

    if (localmode == true) {
		pubkey = fs.readFileSync('./public.key').toString();
		privkey = fs.readFileSync('./private.key').toString();
	} else {
		pubkey = process.env.PUBKey || '';
		privkey = process.env.PRIVKey || '';
	}
	
	// If a record exists for this org, we'll delete it first
	// callback(err)
    this.saveAndConnectOrg = function (orgId, uname, pw, sandbox, callback) {
        console.log("saving org: " + orgId + " " + uname);

		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err);
			client.query('DELETE FROM oauth WHERE org_id = \'' + orgId + '\'', function(err, result) {
				if (err) return callback(err);
				
				var insertstmt;
				var insertarray;
				
				if (localmode == true) {
					insertstmt = noncryptoinsert;
					insertarray = [orgId, sandbox, uname, pw];
				} else {
					insertstmt = pgcryptoinsert;
					insertarray = [orgId, sandbox, uname, pw, pubkey];
				}
				
				client.query(insertstmt, insertarray,
							function(err, result) {
					done(); // release client back to the pool
					if (err) return callback(err);
					console.log("Inserted new org");
					
					// push JWT token to SF org
					return upsertJWTToken(pgConnectionString, orgId, callback);              
				});			
			});
		});
    }
    
    // callback(err, result)
    this.getAllOrgs = function(callback) {
    	pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
			var qstr = 'SELECT org_id FROM oauth';
				
			client.query(qstr, function(err, result) {
					done(); // release client back to the pool
					if (err) return callback(err, null);
					console.log("total orgs returned: " + result.rows.length);
					return callback(null, result);
			});					
		});
    }
    
    // callback(err)
    this.verifyOrgAndToken = function (orgId, token, callback) {
        console.log("verifying org: " + orgId);
        var tokenStr = jwt.encode({orgid: orgId}, jwtSecret);
        
        if (tokenStr == token) {
        	return callback(null);
        } else {
        	return callback({message: 'Invalid token for org: ' + orgId});
        }
    }
    
    // callback(err, returnOrgId)
	this.refreshPhysiciansInOrg = function(orgid, physiciansResults, callback) {
		console.log("refreshing org: " + orgid);
		getConnection(pgConnectionString, orgid, function(err, conn) {
			if (err) return callback(err, null); 

			var physicians = [];
			for (var i = 0; i < physiciansResults.rows.length; i++) {
				physicians.push(
				{Physician_ID__c: physiciansResults.rows[i].physician_id,
				Last_Name__c: physiciansResults.rows[i].last_name,
				First_Name__c: physiciansResults.rows[i].first_name,
				Specialization__c: physiciansResults.rows[i].specialization,
				Zip_Postal_Code__c: physiciansResults.rows[i].zipcode}
				);
			}
			var options = {
				extIdField : "Physician_ID__c"
			};
		
			// The following call to bulk.load achieves the full batch process in one method call.
			// To watch the individual batch responses, you can create a job, then execute
			// a batch and watch for responses from queued batches. See documentation here
			// for options on calling bulk api: https://www.npmjs.com/package/node-salesforce
			conn.bulk.load("Physician__c", "upsert", options, physicians, function(err, rets) {
				if (err) return callback(err, null);

				for (var i=0; i < rets.length; i++) {
					if (rets[i].success) {
						console.log("#" + (i+1) + " upserted successfully, id = " + rets[i].id);
					} else {
						console.log("#" + (i+1) + " error occurred, message = " + rets[i].errors.join(', '));
					}
				}
 
				var timestamp = strftime('%F %H:%M:%S');
				var physIDs = '';
				var first = 'true';
				for (ix in physicians) {
					if (first != 'true') {
						physIDs = physIDs + ', ';
					}
					first = 'false';
					physIDs = physIDs + ('\'' + physicians[ix].Physician_ID__c + '\'');
				}
				var upstr = 'UPDATE "PhysiciansRefresh" SET last_refreshed=\'' + timestamp +
					'\' WHERE org_id = \'' + orgid + '\' and physician_id in (' + physIDs + ')';
				console.log("upstr: " + upstr);
				pg.connect(pgConnectionString, function(err, client, done) {
					client.query(upstr, function(err, result) {
						done(); // release client back to the pool
						if (err) {
							console.log('Unable to update physician records in postgres db. - ' + JSON.stringify(err));
							return callback(err, null);
						}

						return callback(null, orgid);
					});
				});

			});
		});	
	}

}

// helper functions:

// callback(err, conn)
function getConnection(pgConnectionString, orgId, callback) {

	var selectstmt;
	var selectarray;

	if (localmode == true) {
		selectstmt = noncryptoselect;
		selectarray = [orgId];
	} else {
		selectstmt = pgcryptoselect;
		selectarray = [orgId, privkey];
	}
	
	pg.connect(pgConnectionString, function(err, client, done) {
		if (err) return callback(err, null);
		
		client.query(selectstmt, selectarray, function(err, result) {
			done(); // release client back to the pool
			if (err) return callback(err, null);
			if (result.rows.length < 1) {
				return callback({message: 'unregistered org'}, null);
			}
			var orgId = '';
			var sandbox = '';
			var uname = '';
			var pw = '';		
			if (localmode == true) {
				orgId = result.rows[0].org_id;
				sandbox = result.rows[0].sandbox;
				uname = result.rows[0].uname;
				pw = result.rows[0].pw;
			} else {
				orgId = result.rows[0].org_id;
				sandbox = result.rows[0].sandbox;
				uname = result.rows[0].uname_decrypt;
				pw = result.rows[0].pw_decrypt;
			}
			// no Oauth2 client secret/key pair is required with SOAP API login
			var lserv = "https://login.salesforce.com";
			if (sandbox == 'on') {
				lserv = "https://test.salesforce.com";
			}
			
			var conn = new sf.Connection({loginUrl: lserv});
			conn.login(uname, pw, function (err, uInfo) {
				if (err) return callback(err, null);
				userInfo = uInfo;
				console.log(conn.accessToken);
				console.log(conn.instanceUrl);
				console.log("User id: " + userInfo.id);
				console.log("Org id: " + userInfo.organizationId);
				return callback(null, conn);
			});
		});
	});
}
    
// callback(err)
function upsertJWTToken(pgConnectionString, orgid, callback) {
	console.log('*** in upsertJWTToken');
	getConnection(pgConnectionString, orgid, function(err, conn) {
		if (err) return callback(err); 

		var tokenStr = jwt.encode({orgid: orgid}, jwtSecret);
		var restBody = {
			JWTToken: tokenStr
		};
		
		conn.apex.post("/SetAPIKeys/", restBody, function(res) {
			// the response object structure depends on the definition of apex class
			if (err) return callback(err);
			console.log('Success storing token. Response: ' + JSON.stringify(res));
			return callback(null);
		});
	});	
}

    


module.exports.OrgsDAO = OrgsDAO;

