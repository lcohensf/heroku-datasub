var pg = require('pg'),
strftime = require('strftime');


function PhysiciansDAO(pgConnectionString) {

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof PhysiciansDAO)) {
        console.log('Warning: PhysiciansDAO constructor called without "new" operator');
        return new PhysiciansDAO(pgConnectionString);
    }


    this.insertPhysician = function (first_name, last_name, specialization, zipcode, callback) {
        console.log("inserting physician: " + first_name + " " + last_name + " " + specialization + " " + zipcode);

		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);

			var timestamp = strftime('%F %H:%M:%S');
			var insertArray = [first_name, last_name, specialization, zipcode, timestamp];
			client.query('INSERT INTO "physicians" (first_name, last_name, specialization, zipcode, last_modified) ' + 
							'VALUES ($1, $2, $3, $4, $5) returning physician_id', insertArray,
							function(err, result) {
				done(); // release client back to the pool
				if (err) return callback(err, null);
				console.log("Inserted new physician");
				callback(null, result);                
			});					
		});
    }
    
    this.updatePhysician = function (id, first_name, last_name, specialization, zipcode, callback) {
        console.log("updating physician: " + id + " " + first_name + " " + last_name + " " + specialization + " " + zipcode);
			        
		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
			
			var timestamp = strftime('%F %H:%M:%S');

			/*
				UPDATE physicians
   				SET first_name='Allan', last_name='Apple', specialization='Nutrition Counselor',  
        		zipcode='75551'
 				WHERE physician_id='Phys12';
 			*/
 			
 			var updateStr = 'UPDATE "physicians" SET first_name=\'' + first_name + '\', last_name=\'' + last_name + '\', ';
 			updateStr = updateStr + 'specialization=\'' + specialization + '\', zipcode=\'' + zipcode + '\', ';
 			updateStr = updateStr + 'last_modified=\'' + timestamp + '\' WHERE physician_id=\'' + id + '\'';

			client.query(updateStr, function(err, result) {
				done(); // release client back to the pool
				if (err) return callback(err, null);
				console.log("Updated physician " + id);
				callback(null, result);                    
			});					
		});
    }
    
    // callback(err)
    this.subscribeToPhysicians = function (sf_org_id, physician_ids, callback) {
        console.log("in subscribeToPhysicians, org id " + sf_org_id);

		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
	
			var timestamp = strftime('%F %H:%M:%S');
		
			var valsString = '';
			var first = 'true';
			for (ix in physician_ids) {
				if (first != 'true') {
					valsString += ', ';
				}
				first = 'false';
				valsString += ('(\'' + sf_org_id + '\', \'' + physician_ids[ix] + '\', \'' + timestamp + '\' )');
			}
			console.log('valsString before insert: ' + valsString);
		
			// just attempt insert; if any records already exist ignore error
			client.query('INSERT INTO "PhysiciansRefresh" (org_id, physician_id, last_refreshed) ' +
				'VALUES ' + valsString, 
				function(err, result) {
					done(); // release client back to the pool
					if (err) {	
						if (err.code == "23505")
						{
							// record already exists. that's ok
							console.log("some records already existed");
							return callback(null);	
						} else {	
							return callback(err);
						}
					} else {
						console.log('Physician subscription inserted: ' + valsString);	
						return callback(null);												
					} 
			});
					
		});		
    }

    this.getPhysicians = function(num, callback) {
		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
			
			var qstr = 'SELECT first_name, last_name, specialization, zipcode, physician_id FROM "physicians" order by last_name, first_name limit ' + num;
			client.query(qstr, function(err, result) {
					done(); // release client back to the pool
					if (err) return callback(err, null);
					console.log("total physicians returned: " + result.rows.length);
					return callback(null, result);
			});					
		});
    }
    
    // callback(err, returnOrgId, result)
    this.getPhysiciansForRefresh = function(orgId, callback) {
    	console.log('in getPhysiciansForRefresh');
		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
			var selectRefreshRecords = 'SELECT p.physician_id, p.first_name, p.last_name, p.specialization, p.zipcode ' +
  				'FROM "PhysiciansRefresh" pr, "physicians" p ' + 
  				'where  pr.org_id = \'' + orgId + '\' and p.last_modified > pr.last_refreshed and pr.physician_id = p.physician_id';

			client.query(selectRefreshRecords, function(err, result) {
					done(); // release client back to the pool
					if (err) return callback(err, null, null);
					console.log("for orgId: " + orgId + ", retrieved total physicians to refresh: " + result.rows.length);
					return callback(null, orgId, result);
			});					
		});
    }
    
    // callback(err, searchResults) -- searchResults is in JSON array
    this.getPhysiciansMatchingQuery = function(searchString, callback) {
    	console.log('PhysiciansDAO.getPhysiciansMatchingQuery, query: ' + searchString);
    	
		pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
				
			/* Example query:
			SELECT first_name, last_name, specialization, zipcode, physician_id
			FROM physicians
			where last_name like 'Joh%' or specialization like '%Pod%'
			or zipcode like '%2114%'
			order by last_name, first_name limit 100;
			*/
			var queryStr = 'SELECT first_name, last_name, specialization, zipcode, physician_id FROM "physicians" where ';
			queryStr = queryStr + 'last_name like \'%' + searchString + '%\' or specialization like \'%' + searchString + '%\' ';
			queryStr = queryStr + ' or zipcode like \'%' + searchString + '%\' ';
			queryStr = queryStr +  'order by last_name, first_name, specialization, zipcode limit 100';
			//console.log('queryStr = ' + queryStr);
			client.query(queryStr, function(err, result) {
				done(); // release client back to the pool
				if (err) return callback(err, null);
				
				console.log("total physicians returned: " + result.rows.length);
				//console.log("result: " + JSON.stringify(result));
				
				// build JSON body to return 
				var searchResults = {physicians : []};
				for (i = 0; i < result.rows.length; i++) {
					var row = result.rows[i];
					//console.log('row: ' + JSON.stringify(row));
					var physician = {
						last_name : row.last_name,
						first_name : row.first_name,
						specialization : row.specialization,
						physician_id : row.physician_id
					};
					//console.log('physician: ' + JSON.stringify(physician));
					searchResults.physicians.push(physician);
				}
				//console.log('searchResults: ' + JSON.stringify(searchResults));
				return callback(null, searchResults);
			});				
		});
    }

    this.getPhysicianById = function(id, callback) {
        pg.connect(pgConnectionString, function(err, client, done) {
			if (err) return callback(err, null);
			
			var qstr = 'SELECT first_name, last_name, specialization, zipcode, physician_id FROM "physicians" where physician_id = \'' + id + '\'';
			console.log('getting physician query string: ' + qstr);
			client.query(qstr, function(err, result) {
				done(); // release client back to the pool
				if (err) return callback(err, null);
				return callback(null, result);					
			});	
		});   
    }

}

module.exports.PhysiciansDAO = PhysiciansDAO;
