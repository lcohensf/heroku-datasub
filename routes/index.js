var Physicians = require('./physicians'),
	PhysiciansREST = require('./physiciansREST'),
	Orgs = require('./orgs'),
    ErrorHandler = require('./error').errorHandler,
    SecurityHandler = require('./security'),
	methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    path = require('path');

module.exports = exports = function(app, pgConnectionString) {
	var physicians = new Physicians(pgConnectionString);
	var physiciansREST = new PhysiciansREST(pgConnectionString);
	var securityHandler = new SecurityHandler(pgConnectionString);
	var orgs = new Orgs(pgConnectionString);
	
	app.use(methodOverride('_method')); // Use in POST requests for other request types: PUT, DELETE, PATCH
	/*// Would leverage like this:
	// <form method="POST" action="/resource?_method=DELETE">
	// <button type="submit">Delete resource</button>
	// </form>
	*/
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.set('views', path.join(__dirname, '../views'));
	app.set('view engine', 'jade');
	
	// need to fix the redirect... it's catching http requests but not redirecting correctly
	//app.use(securityHandler.requireHTTPSMiddleware);
	//app.use(securityHandler.requirePostHeadersMiddleware);
	
	
	app.get('/',  function(req,res) {
  		res.render('index', { title: 'Salesforce.com Data Service Reference Architecture on Heroku' })
	});

	// no support for listing or editing org records; only support entering org info then upserting	
	app.get('/authOrg', orgs.authorizeOrg);
	app.post('/saveOrg', orgs.saveOrg);
	app.get('/saveOrg', function(req, res, next) {
		return next({message: 'GET /saveOrg not supported.'});
	});

	app.post('/subscribe', physiciansREST.subscribe);
	app.post('/findPhysicians', physiciansREST.findPhysicians);
	
	/* Postgres database - physicians CRUD UI */
	// display list of physicians -- this implementation limits the list shown, pagination not yet supported
	app.get('/physicians', physicians.listPhysicians);

	// create a physician
	app.get('/physicians/new', physicians.newPhysician);
	app.post('/physicians/create', physicians.createPhysician);

	// display a physician
	app.get('/physicians/:id', physicians.getPhysician);
	
	// edit an existing physician
	app.get('/physicians/:id/edit', physicians.editPhysician);
	app.post('/physicians/:id/update', physicians.updatePhysician);
	
	// no delete physician function yet
	
	// Error handling middleware
    app.use(ErrorHandler);
}