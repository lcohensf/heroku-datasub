var express = require('express'),
	app = express(),
	routes = require('./routes'),
	//errorHandler = require('errorhandler'),
	path = require('path'),
	sf = require('node-salesforce');

/* playing around: 
var methodOverride = require('method-override');
app.use(methodOverride('_method')); // Use in POST requests for other request types: PUT, DELETE, PATCH
// Would leverage like this:
// <form method="POST" action="/resource?_method=DELETE">
// <button type="submit">Delete resource</button>
// </form>
*/

var port = process.env.PORT || 3001; // use heroku's dynamic port or 3001 if localhost

// Using Lynn's DE 1 org
// no Oauth2 client information is required with SOAP API login

var lserv = process.env.LOGIN_SERVER || "https://login.salesforce.com";
var username = process.env.USERNAME || 'sbspfun@yahoo.com';
// password + security token:
var password = process.env.PASSWORD || 'd3M0F04cey0aXxkPaOWGq0lffMsEWTreRb'

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//app.use(errorHandler);

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
		res.render("accounts", { title: 'Accounts', data: result.records } );
		
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


var server = app.listen(port, function() {
	console.log('Listening on port %d', server.address().port);
});