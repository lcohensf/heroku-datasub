var pg = require('pg'),
strftime = require('strftime');

/* The PhysiciansCRUD must be constructed with a connected postgres db */
function PhysiciansCRUD (pgConnectionString) {

	this.listPhysicians = function(req, res) {

		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) {
				console.log('Unable to connect to postgres db. ' + JSON.stringify(err));
				res.status(500).body('error retrieving data');
				return;
			}
			client.query('SELECT first_name, last_name, specialization, physician_id FROM "physicians" order by last_name, first_name limit 100',  
				function(err, result) {
					done(); // release client back to the pool
					if (err) {
						console.log('Unable to retrieve physician records from postgres db. - ' + JSON.stringify(err));
						res.status(500).body('error retrieving data');
						return;
					}
					console.log("total physicians returned: " + result.rows.length);
					res.render("physicians/physicians", { title: 'Physicians', data: result } );
				});					

		
		});
	}

	this.newPhysician = function(req, res) {
		var phyFields = {
			fields: [{name: "first_name", label: "First name"}, 
			{name: "last_name", label: "Last name"},
			{name: "specialization", label: "Specialization"}
			]
		};
		res.render('physicians/new', { title: 'New Physician', data: phyFields })
	}

	this.createPhysician = function(req, res) {

		console.log('got this for physician data: ' + JSON.stringify(req.body.physician));
	
		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) {
				console.log('Unable to connect to postgres db. ' + JSON.stringify(err));
				res.status(500).body('error retrieving data');
				return;
			}
			var ph = req.body.physician;
			var timestamp = strftime('%F %H:%M:%S');
			var insertArray = [ph.first_name, ph.last_name, ph.specialization, timestamp];
			client.query('INSERT INTO "physicians" (first_name, last_name, specialization, last_modified) ' + 
							'VALUES ($1, $2, $3, $4) returning physician_id', insertArray,
							function(err, result) {
				done(); // release client back to the pool
				if (err) {
					console.log('Unable to insert physician to postgres db. ' + JSON.stringify(err));
					res.status(500).body('error retrieving data');
					return;
				} else {
					res.redirect('/physicians/'+result.rows[0].physician_id);
					res.end();                 
				} 
			});
					
		});
			
	}

	this.getPhysician = function(req, res) {

		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) {
				console.log('Unable to connect to postgres db. ' + JSON.stringify(err));
				res.status(500).body('error retrieving data');
				return;
			}
			client.query('SELECT first_name, last_name, specialization, physician_id FROM "physicians" where physician_id = \'' + req.params.id + '\'', 
				function(err, result) {
					done(); // release client back to the pool
					if (err) {
						console.log('Unable to retrieve physician record for id: ' + req.params.id);
						res.status(500).body('error retrieving data');
						return;
					}
				
					res.render("physicians/show", { title: 'Physician Details', data: result } );
				});					

		
		});
	}

	this.editPhysician = function(req, res) {

		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) {
				console.log('Unable to connect to postgres db. ' + JSON.stringify(err));
				res.status(500).body('error retrieving data');
				return;
			}
			client.query('SELECT first_name, last_name, specialization, physician_id FROM "physicians" where physician_id = \'' + req.params.id + '\'', 
				function(err, result) {
					done(); // release client back to the pool
					if (err) {
						console.log('Unable to retrieve physician record for id: ' + req.params.id);
						res.status(500).body('error retrieving data');
						return;
					}
					//console.log("result: " + JSON.stringify(result));
					res.render("physicians/edit", { title: 'Edit Physician', data: result } );
				});					

		
		});
	}

	this.updatePhysician = function(req, res) {
	
		console.log('got this for physician data: ' + JSON.stringify(req.body.physician));
		console.log('req.params.id: ' + req.params.id);
	
		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) {
				console.log('Unable to connect to postgres db. ' + JSON.stringify(err));
				res.status(500).body('error retrieving data');
				return;
			}
			var ph = req.body.physician;
			var timestamp = strftime('%F %H:%M:%S');
			var updateArray = [ph.first_name, ph.last_name, ph.specialization, timestamp, req.params.id];
			//console.log('updateArray: ' + JSON.stringify(updateArray));

			client.query('UPDATE "physicians" SET first_name=$1, last_name=$2, specialization=$3, last_modified=$4 ' + 
							'WHERE physician_id = $5 ', updateArray,
							function(err, result) {
				done(); // release client back to the pool
				if (err) {
					console.log('Unable to update physician to postgres db. ' + JSON.stringify(err));
					res.status(500).body('error retrieving data');
					return;
				} else {
					res.redirect('/physicians/'+ph.physician_id);
					res.end();                  
				} 
			});
					
		});
	}
}

module.exports = PhysiciansCRUD;