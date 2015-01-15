var pg = require('pg'),
strftime = require('strftime');


function PhysiciansDAO(pgConnectionString) {

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof PhysiciansDAO)) {
        console.log('Warning: PhysiciansDAO constructor called without "new" operator');
        return new PhysiciansDAO(pgConnectionString);
    }


    this.insertPhysician = function (first_name, last_name, specialization, callback) {
        console.log("inserting physician: " + first_name + " " + last_name + " " + specialization);

		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);

			var timestamp = strftime('%F %H:%M:%S');
			var insertArray = [first_name, last_name, specialization, timestamp];
			client.query('INSERT INTO "physicians" (first_name, last_name, specialization, last_modified) ' + 
							'VALUES ($1, $2, $3, $4) returning physician_id', insertArray,
							function(err, result) {
				done(); // release client back to the pool
				if (err) return callback(err, null);
				console.log("Inserted new physician");
				callback(err, result);                
			});
					
		});
    }
    
    this.updatePhysician = function (id, first_name, last_name, specialization, callback) {
        console.log("updating physician: " + id + " " + first_name + " " + last_name + " " + specialization);
			        
		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
			
			var timestamp = strftime('%F %H:%M:%S');
			var updateArray = [first_name, last_name, specialization, timestamp, id];

			client.query('UPDATE "physicians" SET first_name=$1, last_name=$2, specialization=$3, last_modified=$4 ' + 
							'WHERE physician_id = $5 ', updateArray,
							function(err, result) {
				done(); // release client back to the pool
				if (err) return callback(err, null);
				console.log("Updated physician " + id);
				callback(err, result);                    
			});
					
		});
    }

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
    

}

module.exports.PhysiciansDAO = PhysiciansDAO;
