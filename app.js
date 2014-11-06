var express = require('express'),
	app = express(),
	routes = require('./routes'),
	errorHandler = require('errorhandler'),
	path = require('path'),
	pg = require('pg'),
	sf = require('node-salesforce'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    strftime = require('strftime');

var pgConnectionString = process.env.DATABASE_URL || 'postgres://postgres:misspiggy@localhost:5432/postgres';

app.use(methodOverride('_method')); // Use in POST requests for other request types: PUT, DELETE, PATCH
/*// Would leverage like this:
// <form method="POST" action="/resource?_method=DELETE">
// <button type="submit">Delete resource</button>
// </form>
*/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



// no Oauth2 client information is required with SOAP API login

var lserv = process.env.LOGIN_SERVER || "https://login.salesforce.com";
var username = process.env.USERNAME || 'lcohen@fdataserv.poc';
// password + security token:
var password = process.env.PASSWORD || '8DemoISV!0vRbUsQmV8RwbR5WLjwP0LZPD'

app.set('port', process.env.PORT || 3001); // use heroku's dynamic port or 3001 if localhost
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


var userInfo;

var conn = new sf.Connection({loginUrl: lserv});


/*
//Use the following to establish setup connection rather than login if you've stored instanceURL
//and accessToken, or just grabbed it from console if testing locally
var conn = new sf.Connection({
  instanceUrl : 'https://na15.salesforce.com',
  accessToken : '00Di0000000g6YX!AQ8AQFFVTE3YF9pdHKGiA2nn8ehnrOZ89xZUJJZ2fVt7uZwQ73v_XdA04RelRA__ImsMohDrDzlrrXn.GpElb8yZcYtwmM_n'
});
*/
/*
conn.login(username, password, function (err, uInfo) {
	if (err) { return console.error(err); }
	userInfo = uInfo;
	console.log(conn.accessToken);
	console.log(conn.instanceUrl);
	console.log("User id: " + userInfo.id);
	console.log("Org id: " + userInfo.organizationId);
});
*/


app.get('/', routes.index);

// Accounts listing just for testing purposes
app.get('/accounts', function(req,res) {

	conn.query('select id, name from account limit 10', function(err, result) {
		if (err) {console.error(err); res.send('Error'); res.end; }
		console.log("total: " + result.totalSize);
		console.log("fetched: " + result.records.length);
		for (var i = 0; i < result.records.length; i++ ) {
			console.log('Record ' + i + ': ' + JSON.stringify(result.records[i]));
		}
		res.render("accounts", { title: 'Accounts in Salesforce - just for testing connection', data: result.records } );
		
	});
});

if (!Date.prototype.toISOString) {
  (function() {

    function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }

    Date.prototype.toISOString = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
    };

  }());
}

app.get('/dt', function(req,res) {

console.log(strftime('%F %H:%M:%S'));

res.status(200);
res.end();
			return;
});

app.get('/testsub', function(req, res) {

	res.render("testsub", { title: 'Enter subscription info'} );

});

app.post('/subscribe', function(req, res) {
	/*if(req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === "http") {
    	console.log("Caught /register over http. Redirecting to: " + "https://" + req.headers.host + req.url);
    	res.redirect("https://" + req.headers.host + req.url);
    	return;
	}*/
	
	if (typeof req.body.sf_org_id == 'undefined')  {
		console.log('Handling /subscribe. Request body does not include required fields. Body: ' + JSON.stringify(req.body));
		res.status(400).body('Incorrect format.');
		res.end();
		return;
	}
	console.log('body: '  + JSON.stringify(req.body));
	
	var dev = {
		sf_org_id: req.body.sf_org_id || '',
		physician_ids: req.body.physician_ids || []
	};
	

    pg.connect(pgConnectionString, function(err, client, done) {
		if (err) {
			
			console.log('Error connecting to postgres db: ' + JSON.stringify(err));	
			res.status(500).body('Internal error');
			return;
		}
		/*
		INSERT INTO films (code, title, did, date_prod, kind) VALUES
    	('B6717', 'Tampopo', 110, '1985-02-10', 'Comedy'),
    	('HG120', 'The Dinner Game', 140, DEFAULT, 'Comedy');*/

		var timestamp = strftime('%F %H:%M:%S');
		
		var valsString = '';
		var first = 'true';
		for (ix in dev.physician_ids) {
			if (first != 'true') {
				valsString += ', ';
			}
			first = 'false';
			valsString += ('(\'' + dev.sf_org_id + '\', \'' + dev.physician_ids[ix] + '\', \'' + timestamp + '\' )');
		}
		console.log('valsString before insert: ' + valsString);
		
		// just attempt insert; if any records already exists ignore error
		client.query('INSERT INTO "PhysiciansRefresh" (org_id, physician_id, last_refreshed) ' +
			'VALUES ' + valsString, 
			function(err, result) {
				done(); // release client back to the pool
				if (err) {	
					if (err.code == "23505")
					{
						// record already exists. that's ok
						console.log("some records already existed");	
					} else {
					
					console.log('Error inserting physicians subscription: ' + JSON.stringify(err));	
					res.status(500).body('Internal error');
					return;
					}
				} else {
			
					console.log('Physician subscription inserted: ' + valsString);													
				} 
		});	

	});		

  res.status(200);
  res.write('Success.');
  res.end();
});

app.get('/physicians', function(req,res) {

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
});

// form to create a new physician
app.get('/physicians/new', function(req, res) {
	var phyFields = {
		fields: [{name: "first_name", label: "First name"}, 
		{name: "last_name", label: "Last name"},
		{name: "specialization", label: "Specialization"}
		]
	};
	res.render('physicians/new', { title: 'New Physician', data: phyFields })
});

// create the physician in postgres
app.post('/physicians/create', function(req, res) {

	console.log('got this for physician data: ' + JSON.stringify(req.body.physician));
	
	pg.connect(pgConnectionString, function(err, client, done) {
		if (err) {
			console.log('Unable to connect to postgres db. ' + JSON.stringify(err));
			res.status(500).body('error retrieving data');
			return;
		}
		var ph = req.body.physician;
		var insertArray = [ph.first_name, ph.last_name, ph.specialization];
		client.query('INSERT INTO "physicians" (first_name, last_name, specialization) ' + 
               			'VALUES ($1, $2, $3) returning physician_id', insertArray,
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
			
});

// display the physician
app.get('/physicians/:id', function(req, res) {
	
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
});

// form to update an existing physician
app.get('/physicians/:id/edit', function(req, res) {

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
});

// update the physician in postgres
app.post('/physicians/:id/update', function(req, res) {
	
	console.log('got this for physician data: ' + JSON.stringify(req.body.physician));
	console.log('req.params.id: ' + req.params.id);
	
	pg.connect(pgConnectionString, function(err, client, done) {
		if (err) {
			console.log('Unable to connect to postgres db. ' + JSON.stringify(err));
			res.status(500).body('error retrieving data');
			return;
		}
		var ph = req.body.physician;
		var updateArray = [ph.first_name, ph.last_name, ph.specialization, req.params.id];

		client.query('UPDATE "physicians" SET first_name=$1, last_name=$2, specialization=$3 ' + 
               			'WHERE physician_id = $4 ', updateArray,
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
});


app.get('/testbulk', function(req,res) {
	// generate a number for creation of records with unique names
	var startNum = Number((Math.random() * 100) + 1).toFixed(0); // numbers between 1 and 100
	// records to insert, generate 10
	var accounts = [];
	for (i = 0; i < 10; i++) {
		accounts[i] = { Name: 'Bulk' + startNum + '.' + i };
	}
	console.log('About to bulk insert this array: ' + JSON.stringify(accounts));
	
	conn.bulk.load("Account", "insert", accounts, function(err, rets) {
		if (err) { console.error(err); res.send('error'); res.end(); }
  		var msg = '';
  		for (var i=0; i < rets.length; i++) {
    		if (rets[i].success) {
    			msg += "#" + (i+1) + " loaded successfully, id = " + rets[i].id + '\r';

    		} else {
      			msg += "#" + (i+1) + " error occurred, message = " + rets[i].errors.join(', ');
    		}

  		}
  		console.log(msg);
      	res.send(msg + '<br>');
  		res.end();
	});
});

// error handling middleware should be loaded after the loading the routes
if ('development' == app.get('env')) {
  app.use(errorHandler());
}

var server = app.listen(app.get('port'), function() {
	console.log('Listening on port %d', server.address().port);
});