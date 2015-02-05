# dataserv

This node.js application is part of a Salesforce.com Data Subscription Reference Architecture which consists of 
two components: 1) An open source Force.com app and 2) this node.js application designed for deployment to Heroku. 

This Data Subscription Reference Architecture is meant to address a common use case for ISV partners of Salesforce.com
that have both a centralized data service and a Salesforce.com app that utilizes the centralized data service. This
reference architecture implements an example use case targeted at the Healthcare vertical with Physician records
maintained in a central Postgres database hosted on Heroku. However, the patterns implemented in this ref. arch. are
generally applicable to any industry.

The Heroku components are installed once and support multiple Salesforce.com orgs, essentially, a hub-and-spoke architecture, with
the hub implemented as a multi-tenant service on Heroku. Users of the Salesforce.com app subscribe to Physician records maintained on Heroku and periodically
receive any refreshed data from a refresh service implemented in node.js as a worker process. 

At a systems level this reference architecture consists of 5 components:

On Heroku

1. Web server providing UI for maintaining Physician records and UI for registering 
Salesforce.com orgs with the subscription service. This Web server also implements the REST services called
from Salesforce.com orgs to subscribe to Physician records.
2. Refresh worker process for pushing updated Physician records to those orgs that have subscribed to the 
modified records. 
3. Heroku Scheduler - an optional Heroku add-on for automatically running the Refresh worker process, similar to cron jobs on Unix.
4. Postgres database with encryption at rest extension

On Salesforce.com

1. An application that implements the subscription workflow and maintains a local copy of Physician records.


If you are new to Salesforce.com or development on the Salesforce.com platform, check out the the developer community at: https://developer.salesforce.com/

If you are new to Heroku or developing node.js applications on Heroku, check out  this "Getting Started with node.js on Heroku" article: https://devcenter.heroku.com/articles/getting-started-with-nodejs

## Deploying to Heroku

First generate a public key/private key pair for use with postgres encryption at rest. This reference app uses keys generated with the RSA algorithm,
length 2048 (GPG Keychain Access was used to generate the keys). Do not set a passphrase for the key pair. 
See documentation on postgres pgcrypto for details: http://www.postgresql.org/docs/9.1/static/pgcrypto.html

In the directory where you clone this repository:

Create heroku app:

>heroku create

Create postgres database on heroku:

>heroku addons:add heroku-postgresql:dev

Add pgcrypto extension to postgres database:

>heroku pg:psql --app your_heroku_app_name

>create extension pgcrypto;

>\q

Create tables and sequences in the default schema of your postgres database by running statements in file "dbcreate.txt". 
(pgAdmin3 is a convenient tool for working with postgres databases.)

Set environment variables on heroku. (For the JWTSecret variable, use a random sequence of approximately 20 letters and numbers.)

>heroku config:set JWTSecret=YOUR_JWT_TOKEN_SALT_STRING

>heroku config:set PUBKey='insert full pubkey string here'

>heroku config:set PRIVKey='insert full privkey string here'

It is important to enclose the values for the PUBKey and PRIVKey variables with single quotes.

These keys look like the following text when exported from GPG Keychain Access and similar tools:
```
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG/MacGPG2 v2.0.22 (Darwin)
Comment: GPGTools - https://gpgtools.org

mQENBFTSWd0BCADGcXujMxhNkBG67gTfnHG/irkjiszgPsydRX1/+XfBlFrmrMHi
KjcfnakKHUtYfVHnDoxkLnugAAYs0Dp3QQhmfHAArQQqbrRAASJNk6xsqjgH2u84
.... rest of key omitted....
Sis7rX+hEln5Ke0qndwrnTRAvv4rUXB1jz2k0KmspC043vWuhqhBPi9zHziOyQg4
5VL8wNlP3FSrCB2T
=ykGX
-----END PGP PUBLIC KEY BLOCK-----
```

Push the app to heroku:

>git push heroku master

### About the Procfile:

#### Web server

This repository includes a web server app with the following capabilities:

1. UI for maintaining the example central repository of Physicians data
2. UI for authorizing 2 way API calls between the Heroku app and Salesforce orgs
3. REST web services for Salesforce orgs to subscribe to Physicians records

web: node app.js

#### Data subscription refresh worker process

This repository includes a worker process implemented in refresh.js that pushes modifications to Physician records from the central postgres repository 
to the subscribed orgs.

worker: node refresh.js

You may either manually run the refresh.js app from a console window (heroku run worker) or you can setup the heroku scheduler add-on to run the refresh process automatically:

>heroku addons:add scheduler:standard

To manage scheduled jobs and schedule "heroku run worker":

>heroku addons:open scheduler


## Installing Salesforce app:

1. Sign up for a free Salesforce.com Developer Environment at https://developer.salesforce.com/. (Do not install this app into a Developer Edition org where you have defined a namespace or created a managed package.)
2. Install the app into your org by either:
	* Using the provided unmanaged package by navigating to the following URL while logged into your Salesforce org: https://login.salesforce.com/packaging/installPackage.apexp?p0=04tj0000001YGTL
	* Or, you may clone the source for the app from this github repository: https://github.com/lcohensf/force-datasub.git After deploying the source code to your org, set visibility and access for all elements of the app and follow the remaining instructions here for configuring the remote site setting and custom setting.
3. Create a Remote Site Setting for the Heroku app services (see Security Controls in Setup menu). The remote site URL should be the path to your Heroku app, e.g. https://mydataservice.heroku.com
4. Configure a protected custom setting named, Integration (see Develop - Custom Settings in Setup menu).  The "Integration" custom setting should be type, List, and have Object Name, Integration. 
Length of items in list should be 355.
Then, create 2 data sets in the Integration setting: JWTToken and DataServiceURL. (Note: The unmanaged package will create the Integration custom setting for you but you will need 
to create the 2 data sets within the setting.)
You can set the Key value for JWTToken to anything. It will be overwritten as part of connecting your Heroku app to this org (see directions below).
Set the value of DataServiceURL to the same URL as the Remote Site Setting that you created above, e.g. https://mydataservice.heroku.com
Be sure to not include anything in the DataServiceURL Key value, such as trailing slashes, after "heroku.com".
5. Determine which user account you will utilize for API connections from the Heroku app to your org. Generate security token for this user and make a note of the username, password, and security token.
6. Determine the 18 character organization ID for your org., which you can retrieve using the developer console by executing the following in the execute anonymous window then looking at the logs:
	>String orgId = UserInfo.getOrganizationId();

	>System.debug('orgID: ' + orgId);
7. After completing the connection of the Heroku server app to this Salesforce org (see instructions below), you may access the app via the "Physicians Repository" app in the app menu.

## Connect this Heroku server app to a Salesforce org:

First, complete the installation of the Salesforce app into your org as documented in the section above.

Then, navigate to your-heroku-app/authorg, e.g. https://mydataservice.heroku.com/authorg, and enter the following information:

* The 18 character organization ID for your Salesforce Org
* The username and password for the account that you will use for call-ins to the salesforce org. The account must have write access to the custom setting, Integration, and update/write access to all Physician__c records.
* The password must be of the form: password followed immediately by the security token for the user.

If the connection is successful, you will be returned to the home page of the heroku app.

This Heroku app is designed to support multiple Salesforce.com orgs running the dataserv app. Repeat the "Installing Salesforce app" instructions and the "Connect this Heroku server app to a Salesforce org" instructions for each org.


