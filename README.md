# dataserv

This node.js application is part of a Salesforce.com Data Subscription Reference Architecture which consists of 
two components: 1) An open source Force.com app and 2) the node.js application in this repo designed for deployment to heroku. 

If you are new to Salesforce.com or development on the Salesforce.com platform, check out the the developer community at: https://developer.salesforce.com/
If you are new to Heroku or developing node.js applications on Heroku, check out  this "Getting Started with node.js on Heroku" article: https://devcenter.heroku.com/articles/getting-started-with-nodejs

## Deploying the node.js app to Heroku

First generate a public key/private key pair for postgres encryption at rest. This reference app uses keys generated with the RSA algorithm,
length 2048. Do not set a passphrase for the key pair. See documentation on postgres pgcrypto for details: http://www.postgresql.org/docs/9.1/static/pgcrypto.html

In the directory where you clone this repository:

Create heroku app:
>heroku create

Create postgres database on heroku:
>heroku addons:add heroku-postgresql:dev

Add pgcrypto extension to postgres database:
>heroku pg:psql --app your_heroku_app_name
>create extension pgcrypto;
>\q

Create schema in postgres database by running statements in file "dbcreate.txt". (pgAdmin3 is a convenient tool for working with postgres databases.)

Set environment variables on heroku. (For the JWTSecret variable, use a random sequence of around 20 letters and numbers.)

>heroku config:set JWTSecret=YOUR_JWT_TOKEN_SALT_STRING
>heroku config:set PUBKey='insert full pubkey string here'
>heroku config:set PRIVKey='insert full privkey string here'

As an example, the PUBKey variable will begin with '-----BEGIN PGP PUBLIC KEY BLOCK-----' and end with '-----END PGP PUBLIC KEY BLOCK-----'

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

This repository includes a worker process implemented in refresh.js that pushes modifications to Physician records in the central postgres repository 
to the subscribed orgs.

worker: node refresh.js

You may either manually run the refresh.js app from a console window (heroku run worker) or you can setup the heroku scheduler add-on to run the refresh process automatically:

>heroku addons:add scheduler:standard

To manage scheduled jobs and schedule "heroku run worker":
>heroku addons:open scheduler

## Connect this heroku server to a Salesforce org:

First, complete the installation of the Salesforce app into your org as documented in the section below.

Then, navigate to your-heroku-app/authorg, e.g. https://mydataservice.heroku.com/authorg
Enter the 18 character organization ID for your Salesforce Org
Enter the username and password for the account that you will use for call-ins to the salesforce org. The account must have write access to the custom setting, Integration, and update/write access to all Physician__c records.
The password must be of the form: password followed immediately by the security token for the user.

If the connection is successful, you will be returned to the home page of the heroku app.


## Installing Salesforce app:

1. Sign up for a free Salesforce.com Developer Environment at https://developer.salesforce.com/
2. Install the app into your org using the provided unmanaged package by navigating to the following URL while logged into your Salesforce org:
https://login.salesforce.com/packaging/installPackage.apexp?p0=04tj0000001YGTL
Alternatively, you may clone the source for the app from this github repository: (coming soon). After deploying the source code, set visibility and access for all elements of the app and follow the remaining instructions here for configuring the remote site setting and custom setting.
3. Create a Remote Site Setting for the heroku app services (see Security Controls in Setup menu). The remote site URL should be the path to your heroku app, e.g. https://mydataservice.heroku.com
4. Configure a custom setting named, Integration (see Develop - Custom Settings in Setup menu).  Integration setting should be type, List, and have Object Name, Integration. Set visibility to protected. Edit or create 2 items in the Integration setting: JWTToken and DataServiceURL.
Size of JWTToken should be 355, and you do not have to set the value of this setting because it is set for you as part of connecting your heroku app to this org (see directions above).
Set the value of DataServiceURL to the same URL as the Remote Site Setting that you created above, e.g. https://mydataservice.heroku.com
5. Determine which user account you will utilize for API connections from the heroku app to your org. Generate security token for this user and make a note of the username, password, and security token.
6. Determine the 18 character organization ID for your org., which you can retrieve using the developer console by executing the following in the execute anonymous window then looking at the logs:
>String orgId = UserInfo.getOrganizationId();
>System.debug('orgID: ' + orgId);

This heroku app is designed to support multiple Salesforce.com orgs running the dataserv app. Repeat these Salesforce app instructions and the instructions above for connecting the heroku server to a Salesforce org for each org.


