var PhysiciansDAO = require('../physiciansDAO').PhysiciansDAO,
validator = require('validator'); // Helper to sanitize form input

/* The Physicians must be constructed with a postgres db connection string */
function Physicians (pgConnectionString) {
    var physicians = new PhysiciansDAO(pgConnectionString);

	this.listPhysicians = function(req, res, next) {
		console.log('in Physicians.listPhysicians');
		physicians.getPhysicians(100, function(err, result) {
			if (err) return next(err);
			
			return res.render("physicians/physicians", { title: 'Physicians', data: result } );
		});
	}

	this.newPhysician = function(req, res, next) {
		console.log('in Physicians.newPhysician');
		var phyFields = {
			fields: [{name: "first_name", label: "First name"}, 
			{name: "last_name", label: "Last name"},
			{name: "specialization", label: "Specialization"}
			]
		};
		return res.render('physicians/new', { title: 'New Physician', data: phyFields });
	}

	this.createPhysician = function(req, res, next) {
		console.log('in Physicians.createPhysician');
		var ph = req.body.physician;

		physicians.insertPhysician(validator.escape(ph.first_name), validator.escape(ph.last_name), validator.escape(ph.specialization), function(err, result) {
            if (err) return next(err);

           	return res.redirect('/physicians/'+result.rows[0].physician_id);
        });
	}

	this.getPhysician = function(req, res, next) {
		console.log('in Physicians.getPhysician');
		var physId = req.params.id;
		
		physicians.getPhysicianById(validator.escape(physId), function(err, result) {
			if (err) return next(err);

            if (!result) {
            	return res.render('physicians/physiciannotfound', { id: physId });
            }
            return res.render("physicians/show", { title: 'Physician Details', data: result } );
		});
	}

	this.editPhysician = function(req, res, next) {
		console.log('in Physicians.editPhysician');
		var physId = req.params.id;
		
		physicians.getPhysicianById(validator.escape(physId), function(err, result) {
			if (err) return next(err);

            if (!result) {
            	return res.render('physicians/physiciannotfound', { id: physId });
            }
            return res.render("physicians/edit", { title: 'Edit Physician', data: result } );
		});        
	}

	this.updatePhysician = function(req, res, next) {
		console.log('in Physicians.updatePhysician');
		var ph = req.body.physician;
		var physId = req.params.id;
		console.log('got this for physician data: ' + JSON.stringify(ph));
		console.log('req.params.id: ' + physId);
	
		physicians.updatePhysician(validator.escape(physId), validator.escape(ph.first_name), validator.escape(ph.last_name), 
			validator.escape(ph.specialization), function(err, result) {
            if (err) return next(err);

           	return res.redirect('/physicians/'+physId);
        });
	}
}

module.exports = Physicians;