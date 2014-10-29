var express = require('express'),
	app = express(),
	nforce = require('nforce'),
	routes = require('./routes'),
	//errorHandler = require('errorhandler'),
	path = require('path');

/* playing around: 
var methodOverride = require('method-override');
app.use(methodOverride('_method')); // Use in POST requests for other request types: PUT, DELETE, PATCH
// Would leverage like this:
// <form method="POST" action="/resource?_method=DELETE">
// <button type="submit">Delete resource</button>
// </form>
*/

var port = process.env.PORT || 3001; // use heroku's dynamic port or 3001 if localhost

// DE 1 org
var cid = process.env.CLIENT_ID || "3MVG9A2kN3Bn17hukWTAp4K5uFCcu3aPL6N8XoDptjPcy5r5J40XCS.cF7currgb5Ux35Q8yGQNlxOCRpSqOa";
var csecr = process.env.CLIENT_SECRET || "1486671818583198331";
var lserv = process.env.LOGIN_SERVER || "https://login.salesforce.com";
var redir = process.env.REDIRECT_URI || 'http://localhost:' + port + '/oauth/_callback';
var username = process.env.USERNAME || 'sbspfun@yahoo.com';
var password = process.env.PASSWORD || 'd3M0F04ce'



app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//app.use(errorHandler);

// use the nforce package to create a connection to salesforce.com
var org = nforce.createConnection({
  clientId: cid,
  clientSecret: csecr,
  redirectUri: redir,
  apiVersion: 'v27.0',  // optional, defaults to v24.0
  environment: 'production',  // optional, sandbox or production, production default
  mode: 'single'
});


// authenticate using username-password oauth flow
org.authenticate({ username: username, password: password }, function(err, resp){
  if(err) {
    console.log('Error: ' + err.message);
  } else {
    console.log('Cached Token: ' + org.oauth.access_token);
  }
});


// Routes
app.get('/', routes.index);

app.get('/hello', function(req, res) {
	console.log('In hello handler');
	res.send('Hello there');
	res.end();
});

// display a list of 10 accounts
app.get('/accounts', function(req, res) {
  //org.query({ query: 'select id, name from account limit 10', oauth: org.oauth }, function(err, resp){
  // in single mode, don't have to pass oauth argument
  org.query({ query: 'select id, name from account limit 10'}, function(err, resp){
    res.render("accounts", { title: 'Accounts', data: resp.records } );
  });
});

// create the account in salesforce
/*app.post('/accounts/create', function(req, res) {
  var obj = nforce.createSObject('Account', req.body.account);
  org.insert({sobject: obj, oauth: oauth}, function(err, resp){
    if (err) {
      console.log(err);
    } else {
      if (resp.success == true) {
        res.redirect('/accounts/'+resp.id);
        res.end();
      }
    }
  })
});
*/


var server = app.listen(port, function() {
	console.log('Listening on port %d', server.address().port);
});