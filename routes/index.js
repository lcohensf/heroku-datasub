var PhysiciansCRUD = require('./physiciansCRUD');

module.exports = exports = function(app, pgConnectionString) {
	var physiciansCRUD = new PhysiciansCRUD(pgConnectionString);
	
	app.get('/',  function(req,res) {
  		res.render('index', { title: 'Welcome to a Salesforce Bulk API demo with node-salesforce module' })
	});
	
	
	app.get('/physicians', physiciansCRUD.listPhysicians);

	// form to create a new physician
	app.get('/physicians/new', physiciansCRUD.newPhysician);

	// create the physician in postgres
	app.post('/physicians/create', physiciansCRUD.createPhysician);

	// display the physician
	app.get('/physicians/:id', physiciansCRUD.getPhysician);

	// form to update an existing physician
	app.get('/physicians/:id/edit', physiciansCRUD.editPhysician);

	// update the physician in postgres
	app.post('/physicians/:id/update', physiciansCRUD.updatePhysician);
}