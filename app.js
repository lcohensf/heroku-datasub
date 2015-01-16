var express = require('express'),
	app = express(),
	routes = require('./routes'),
    cp = require('child_process');

var pgConnectionString = process.env.DATABASE_URL || 'postgres://postgres:misspiggy@localhost:5432/postgres';
app.set('port', process.env.PORT || 3001); // use heroku's dynamic port or 3001 if localhost


routes(app, pgConnectionString);

app.get('/dorefresh', function(req,res) {
	// Just fork the child process and don't worry about results. 
	// This is a manual way to force the refresh. Normal process
	// is for scheduler to run the refresh.
	cp.fork(__dirname + '/refresh.js');
	res.status(200);
  	res.write('Check logs for results.');
  	res.end();
});

var server = app.listen(app.get('port'), function() {
	console.log('Listening on port %d', server.address().port);
});





