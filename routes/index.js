/*
Copyright (c) 2011, salesforce.com, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
    this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.
    * Neither the name of the salesforce.com, Inc. nor the names of its contributors
    may be used to endorse or promote products derived from this software
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
OF THE POSSIBILITY OF SUCH DAMAGE.
*/

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
	/* // Leverage like this:
	// <form method="POST" action="/resource?_method=DELETE">
	// <button type="submit">Delete resource</button>
	// </form>
	*/
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.set('views', path.join(__dirname, '../views'));
	app.set('view engine', 'jade');
	
	// need to fix the redirect... it's catching http requests but not redirecting correctly
	app.use(securityHandler.requireHTTPSMiddleware);
	app.use(securityHandler.requirePostHeadersMiddleware);
	
	
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