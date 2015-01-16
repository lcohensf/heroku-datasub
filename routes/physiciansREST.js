var PhysiciansDAO = require('../physiciansDAO').PhysiciansDAO,
validator = require('validator'); // Helper to sanitize form input

/*  PhysiciansREST must be constructed with a postgres db connection string */
function PhysiciansREST (pgConnectionString) {
    var physicians = new PhysiciansDAO(pgConnectionString);


	this.subscribe = function(req, res, next) {
		console.log('in Physicians.subscribe');
		if (typeof req.body.sf_org_id == 'undefined' || typeof req.body.physician_ids == 'undefined' ||
			req.body.sf_org_id == '' || req.body.physician_ids.length < 1)  {
			console.log('Handling /subscribe. Request body does not include required fields. Body: ' + JSON.stringify(req.body));
			return next({message: 'Org id, token, and physician IDs required in request.'});
		}
		console.log('body: '  + JSON.stringify(req.body));
		
		var sf_org_id = req.body.sf_org_id;
		var physician_ids = req.body.physician_ids;

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
		
	}

	this.findPhysicians = function(req, res, next) {

		var searchString = req.body.query;
		if (typeof searchString == 'undefined') {
			console.log('Handling /findPhysicians. Query string parameter not provided.');
			return next({message: 'Query string parameter required.'});
		}
	
		searchString = validator.escape(searchString);
		console.log('in findPhysicians, query string = ' + searchString);

		physicians.getPhysiciansMatchingQuery(searchString, function(err, searchResults) {
			if (err) return next(err);
			
			res.status(200);
			res.write(JSON.stringify(searchResults));
			res.end();
		});
	}

}

module.exports = PhysiciansREST;