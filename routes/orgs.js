/*
Copyright (c) 2011, salesforce.com, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
    this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.
    * Neither the name of the salesforce.com, Inc. nor the names of its contributors
    may be used to endorse or promote products derived from this software
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
OF THE POSSIBILITY OF SUCH DAMAGE.
*/

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