var PhysiciansDAO = require('../physiciansDAO').PhysiciansDAO,
	OrgsDAO = require('../orgsDAO').OrgsDAO,
	validator = require('validator'); // Helper to sanitize form input

/*  PhysiciansREST must be constructed with a postgres db connection string */
function PhysiciansREST (pgConnectionString) {
    var physicians = new PhysiciansDAO(pgConnectionString);
    var orgs = new OrgsDAO(pgConnectionString);


	this.subscribe = function(req, res, next) {
		console.log('in PhysiciansREST.subscribe');
		
		var sf_org_id = req.body.sf_org_id;
		var token = req.body.jwt_token;
		var physician_ids = req.body.physician_ids;
		
		if (typeof sf_org_id == 'undefined' || typeof physician_ids == 'undefined' || typeof token == 'undefined' ||
			sf_org_id == '' || token == '' || physician_ids < 1)  {
			console.log('Handling /subscribe. Request body does not include required fields. Body: ' + JSON.stringify(req.body));
			return next({message: 'Org id, token, and physician IDs required in request body.'});
		}
		console.log('body: '  + JSON.stringify(req.body));
		
		orgs.verifyOrgAndToken(sf_org_id, token, function(err) {
			if (err) return next(err);
			
			sf_org_id = validator.escape(sf_org_id);

			for (var i = 0; i < physician_ids.length; i++) {
				physician_ids[i] = validator.escape(physician_ids[i]);
			}		
		
			physicians.subscribeToPhysicians(sf_org_id, physician_ids, function(err) {
				if (err) return next(err);
			
				res.status(200);
				res.write('Success.');
				res.end();
			});
		});
		
	}

	this.findPhysicians = function(req, res, next) {
		console.log('in PhysiciansREST.findPhysicians');

		var sf_org_id = req.body.sf_org_id;
		var token = req.body.jwt_token;
		
		if (typeof sf_org_id == 'undefined' || typeof token == 'undefined') {
			console.log('Handling /findPhysicians. org id and token required in request body.');
			return next({message: 'Query string, org id, and token required in request body'});
		}
		
		if (typeof req.body.last_name == 'undefined' && typeof req.body.specialization == 'undefined' && typeof req.body.zipcode == 'undefined') {
			console.log('Handling /findPhysicians. Must provide one or more of the 3 search criteria.');
			return next({message: 'Search string for at least one of last name, specialization, or zip code required in request body'});
		}
		
		var searchLastName = validator.escape(req.body.last_name || '');
		var searchSpecialization = validator.escape(req.body.specialization || '');
		var searchZipcode = validator.escape(req.body.zipcode || '');
		
		orgs.verifyOrgAndToken(sf_org_id, token, function(err) {
			if (err) return next(err);
			
			physicians.getPhysiciansMatchingQuery(searchLastName, searchSpecialization, searchZipcode, function(err, searchResults) {
				if (err) return next(err);
			
				res.status(200);
				res.write(JSON.stringify(searchResults));
				res.end();
			});
		});
	}

}

module.exports = PhysiciansREST;