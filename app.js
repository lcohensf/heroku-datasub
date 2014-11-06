var express = require('express'),
	app = express(),
	routes = require('./routes'),
	errorHandler = require('errorhandler'),
	path = require('path'),
	pg = require('pg'),
	sf = require('node-salesforce'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser');

var pgConnectionString = process.env.DATABASE_URL || 'postgres://postgres:misspiggy@localhost:5432/postgres';
//var pgConnectionString = process.env.DATABASE_URL || 'postgres://jmrxyqrrxbdrgb:ZGuJtw7cpYX9S-lu6PeiPn5Pqm@ec2-54-83-204-104.compute-1.amazonaws.com:5432/d19ugmjh07smop';

app.use(methodOverride('_method')); // Use in POST requests for other request types: PUT, DELETE, PATCH
/*// Would leverage like this:
// <form method="POST" action="/resource?_method=DELETE">
// <button type="submit">Delete resource</button>
// </form>
*/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Using Lynn's DE 1 org
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

conn.login(username, password, function (err, uInfo) {
	if (err) { return console.error(err); }
	userInfo = uInfo;
	console.log(conn.accessToken);
	console.log(conn.instanceUrl);
	console.log("User id: " + userInfo.id);
	console.log("Org id: " + userInfo.organizationId);
});



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
		{name: "specialization", label: "Specialization"},
		{name: "physician_id", label: "Physician id, e.g. Phys000005"}]
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
		var insertArray = [ph.first_name, ph.last_name, ph.specialization, ph.physician_id];
		client.query('INSERT INTO "physicians" (first_name, last_name, specialization, physician_id) ' + 
               			'VALUES ($1, $2, $3, $4) ', insertArray,
                		function(err, result) {
            done(); // release client back to the pool
            if (err) {
            	console.log('Unable to insert physician to postgres db. ' + JSON.stringify(err));
            	res.status(500).body('error retrieving data');
				return;
            } else {
            	res.redirect('/physicians/'+ph.physician_id);
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