var OrgsDAO = require('../orgsDAO').OrgsDAO,
validator = require('validator'); // Helper to sanitize form input

/* Orgs must be constructed with a postgres db connection string */
function Orgs (pgConnectionString) {
    var orgs = new OrgsDAO(pgConnectionString);

	this.authorizeOrg = function(req, res, next) {
		console.log('in Orgs.authorizeOrg');
		var defaultOrgID =  '';
	
		return res.render("authOrg", 
			{ title: 'Enter Salesforce Org Connection Information', 
		  		defaults: {
		  		orgId: defaultOrgID
		  	}
		});
	}

	this.saveOrg = function(req, res, next) {
		console.log('in Orgs.saveOrg');
		var orgId = req.body.org_id;
		var uname = req.body.uname;
		var pw = req.body.pw;
		var sandbox = req.body.sandbox || 'off';
		
		console.log('sandbox: ' + sandbox); 
		
		// not a user friendly handling of required fields; to do - improve
		if ((typeof req.body.org_id == 'undefined') || (typeof req.body.uname == 'undefined') || (typeof req.body.pw == 'undefined')) {
			console.log('Handling /saveOrg. Request body does not include required fields. Body: ' + JSON.stringify(req.body));
			return next({message: 'Required fields not provided'});
		}

		orgs.saveAndConnectOrg(validator.escape(orgId), validator.escape(uname), validator.escape(pw), sandbox, function(err) {
            if (err) return next(err);

           	return res.redirect('/');
        });
	}
}

module.exports = Orgs;