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

var OrgsDAO = require('./orgsDAO').OrgsDAO,
	PhysiciansDAO = require('./physiciansDAO').PhysiciansDAO;


var pgConnectionString = process.env.DATABASE_URL || 'postgres://postgres:misspiggy@localhost:5432/postgres';
var orgs = new OrgsDAO(pgConnectionString);
var physicians = new PhysiciansDAO(pgConnectionString);

orgs.getAllOrgs(function(err, orgsResult) {

	if (err) {
		console.log('Unable to complete refresh. Error retrieving orgs: ' + JSON.stringify(err));
		process.exit(0);
	}
	var numOrgs = orgsResult.rows.length;
	console.log('in refresh.js, retrieved orgs, count: ' + numOrgs);	
	
	for (var i = 0; i < numOrgs; i++) {
		var orgId = orgsResult.rows[i].org_id;
		console.log('refreshing org: ' + JSON.stringify(orgId));

		physicians.getPhysiciansForRefresh(orgId, function(err, orgIdForResults, physiciansResults) {
			if (err) {
				console.log('Unable to retrieve physicians for org: ' + orgIdForResults + ' err: ' + JSON.stringify(err));
				process.exit(0);
			}
			
			if (physiciansResults.rows.length < 1) {
				console.log('in refresh.js, nothing to refresh for orgId: ' + orgIdForResults);
				// nothing to update
			} else {
				console.log('in refresh.js, there are records to refresh for orgId: ' + orgIdForResults);
				orgs.refreshPhysiciansInOrg(orgIdForResults, physiciansResults, function(err, orgIdCompleted) {
					console.log('refresh complete for orgId: ' + orgIdCompleted);
				});
			}
		});
		
	}
	
});



