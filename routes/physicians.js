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

var PhysiciansDAO = require('../physiciansDAO').PhysiciansDAO,
validator = require('validator'); // Helper to sanitize form input

/* The Physicians must be constructed with a postgres db connection string */
function Physicians (pgConnectionString) {
    var physicians = new PhysiciansDAO(pgConnectionString);

	this.listPhysicians = function(req, res, next) {
		console.log('in Physicians.listPhysicians');
		physicians.getPhysicians(100, function(err, result) {
			if (err) return next(err);
			
			return res.render("physicians/physicians", { title: 'Physicians', data: result } );
		});
	}

	this.newPhysician = function(req, res, next) {
		console.log('in Physicians.newPhysician');
		var phyFields = {
			fields: [{name: "first_name", label: "First name"}, 
			{name: "last_name", label: "Last name"},
			{name: "specialization", label: "Specialization"},
			{name: "zipcode", label: "Zip Code"}
			]
		};
		return res.render('physicians/new', { title: 'New Physician', data: phyFields });
	}

	this.createPhysician = function(req, res, next) {
		console.log('in Physicians.createPhysician');
		var ph = req.body.physician;

		physicians.insertPhysician(validator.escape(ph.first_name), validator.escape(ph.last_name), validator.escape(ph.specialization), validator.escape(ph.zipcode), function(err, result) {
            if (err) return next(err);

           	return res.redirect('/physicians/'+result.rows[0].physician_id);
        });
	}

	this.getPhysician = function(req, res, next) {
		console.log('in Physicians.getPhysician');
		var physId = req.params.id;
		
		physicians.getPhysicianById(validator.escape(physId), function(err, result) {
			if (err) return next(err);

            if (!result) {
            	return res.render('physicians/physiciannotfound', { id: physId });
            }
            return res.render("physicians/show", { title: 'Physician Details', data: result } );
		});
	}

	this.editPhysician = function(req, res, next) {
		console.log('in Physicians.editPhysician');
		var physId = req.params.id;
		
		physicians.getPhysicianById(validator.escape(physId), function(err, result) {
			if (err) return next(err);

            if (!result) {
            	return res.render('physicians/physiciannotfound', { id: physId });
            }
            return res.render("physicians/edit", { title: 'Edit Physician', data: result } );
		});        
	}

	this.updatePhysician = function(req, res, next) {
		console.log('in Physicians.updatePhysician');
		var ph = req.body.physician;
		var physId = req.params.id;
		console.log('got this for physician data: ' + JSON.stringify(ph));
		console.log('req.params.id: ' + physId);
	
		physicians.updatePhysician(validator.escape(physId), validator.escape(ph.first_name), validator.escape(ph.last_name), 
			validator.escape(ph.specialization), validator.escape(ph.zipcode), function(err, result) {
            if (err) return next(err);

           	return res.redirect('/physicians/'+physId);
        });
	}
}

module.exports = Physicians;