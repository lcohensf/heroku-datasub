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



