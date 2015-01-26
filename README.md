# dataserv

This node.js application is part of a Salesforce Data Subscription Reference Architecture app which consists of 
two components: Force.com dataserv app and this node.js application designed for 
deployment to heroku. 

To install the Salesforce app:
1. Sign up for a free Salesforce.com Developer Environment at https://developer.salesforce.com/
2. Clone the Salesforce app source from this github repo: to do
3. This heroku app is designed to support multiple Salesforce.com orgs running the dataserv app. Follow the instructions in the Salesforce app repo README file for each instance of the Force.com dataserv app that you setup.


### Deploying to Heroku

First generate a public key/private key pair for postgres encryption at rest. This reference architecture app uses keys generated with RSA algorithm,
length 2048. Do not set a passphrase for the key pair. See documentation on postgres pgcrypto for details: http://www.postgresql.org/docs/9.1/static/pgcrypto.html

In directory where you clone this repository:

Create heroku app:
>heroku create

Create postgres database on heroku:
>heroku addons:add heroku-postgresql:dev

Add pgcrypto extension to postgres database:
>heroku pg:psql --app your_heroku_app_name
>create extension pgcrypto;
>\q

Create schema in postgres database by running statements in file "dbcreate.txt". 

Set environment variables on heroku. (For the JWTSecret variable, use a random sequence of 
10 to 20 letters and characters.)

>heroku config:set JWTSecret=YOUR_JWT_TOKEN_SALT_STRING
>heroku config:set PUBKey='insert full pubkey string here'
>heroku config:set PRIVKey='insert full privkey string here'

As an example, the PUBKey variable will begin with '-----BEGIN PGP PUBLIC KEY BLOCK-----' and end with '-----END PGP PUBLIC KEY BLOCK-----'

Push the app to heroku:
>git push heroku master

## About the Procfile:

### Web server

This repository includes a web server app for:
1. Maintaining the example central repository of Physicians data
2. Authorizing Salesforce orgs to subscribe to example Physicians data service

web: node app.js

### Data subscription refresh worker process

This repository includes a worker process implemented in refresh.js. 

worker: node refresh.js

You can either manually run the refresh.js app (heroku run worker) or you can setup the heroku scheduler add-on to run the refresh process automatically:

>heroku addons:add scheduler:standard

To manage scheduled jobs and schedule "heroku run worker":
>heroku addons:open scheduler

