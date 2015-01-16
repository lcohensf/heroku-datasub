var pg = require('pg'),
	strftime = require('strftime'),
	fs = require("fs"),
	sf = require('node-salesforce'),
	jwt = require('jwt-simple');

var pgcryptoinsert = 'INSERT INTO oauth("org_id", "uname", "pw") '
	+ 'SELECT vals.org_id, pgp_pub_encrypt(vals.uname, keys.pubkey) as uname, '
	+ 'pgp_pub_encrypt(vals.pw, keys.pubkey) as pw '
	+ 'FROM (VALUES ($1, $2, $3)) as vals(org_id, uname, pw) '
	+ 'CROSS JOIN (SELECT dearmor($4) as pubkey) as keys';
				
var noncryptoinsert = 	'INSERT INTO oauth (org_id, uname, pw) VALUES ($1, $2, $3)';

var pgcryptoselect = 'SELECT oauth.org_id, pgp_pub_decrypt(oauth.uname, keys.privkey) as uname_decrypt, '
		+ 'pgp_pub_decrypt(oauth.pw, keys.privkey) as pw_decrypt '
		+ 'FROM oauth CROSS JOIN (SELECT dearmor($2) as privkey) as keys where oauth.org_id = $1';
		
var noncryptoselect = 	'SELECT org_id, uname, pw FROM oauth where org_id = $1';

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
    this.saveAndConnectOrg = function (orgId, uname, pw, callback) {
        console.log("saving org: " + orgId + " " + uname);

		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err);
			client.query('DELETE FROM oauth WHERE org_id = \'' + orgId + '\'', function(err, result) {
				if (err) return callback(err);
				
				var insertstmt;
				var insertarray;
				
				if (localmode == true) {
					insertstmt = noncryptoinsert;
					insertarray = [orgId, uname, pw];
				} else {
					insertstmt = pgcryptoinsert;
					insertarray = [orgId, uname, pw, pubkey];
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
    
	// get all org records
	/*
    this.getPhysicians = function(num, callback) {
		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
			
			var qstr = 'SELECT first_name, last_name, specialization, physician_id FROM "physicians" order by last_name, first_name limit ' + num;
			client.query(qstr, function(err, result) {
					done(); // release client back to the pool
					if (err) return callback(err, null);
					console.log("total physicians returned: " + result.rows.length);
					callback(err, result);
				});					
		});
    }
    */

	// get org record by ID
	/*
    this.getPhysicianById = function(id, callback) {
        pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
			
			var qstr = 'SELECT first_name, last_name, specialization, physician_id FROM "physicians" where physician_id = \'' + id + '\'';
			console.log('getting physician query string: ' + qstr);
			client.query(qstr, function(err, result) {
					done(); // release client back to the pool
					if (err) return callback(err, null);
					callback(err, result);					
				});	
		});   
    }
    */

}

// helper methods, not exported

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
			var uname = '';
			var pw = '';		
			if (localmode == true) {
				orgId = result.rows[0].org_id;
				uname = result.rows[0].uname;
				pw = result.rows[0].pw;
			} else {
				orgId = result.rows[0].org_id;
				uname = result.rows[0].uname_decrypt;
				pw = result.rows[0].pw_decrypt;
			}
			var lserv = process.env.LOGIN_SERVER || "https://login.salesforce.com";
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
			JWTToken: tokenStr,
			OrgId: orgid
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
