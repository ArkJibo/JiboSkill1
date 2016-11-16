"use strict";

let jibo = require ('jibo');
let Status = jibo.bt.Status;

var ngrok = require('ngrok');

ngrok.connect(1337, function (err, url) {console.log("Error Message: " + err);
     console.log('Ngrok URL: ' + url);
   });



var user ='theja2289@gmail.com';
var pass ='@noip2289';
var domain ='jibo.onthewifi.com';

var updater = require('noip-updater');

updater.getPublicIP(function(ip) {
    updater.updateNoIP(user, pass, domain, ip, false, function(body, response, error) {
        console.log(body);
    });
});

//updater.getPublicIP(cb);
//updater.updateNoIP(user, pass, domain, ip[, useHTTPS[, cb]]);




var express = require('express');
var xmlparser = require('express-xml-bodyparser');
var bunyan = require('bunyan');



var helper = require('/Users/VT/github/Jibo-IFTTT-master/node_modules/if-this-then-node/modules/helper');
helper.printStartupHeader();



var pluginManager = require('/Users/VT/github/Jibo-IFTTT-master/node_modules/if-this-then-node/modules/plugin-manager');
var responseGenerator = require('/Users/VT/github/Jibo-IFTTT-master/node_modules/if-this-then-node/modules/response-generator');
var xmlRpcApiHandler = require('/Users/VT/github/Jibo-IFTTT-master/node_modules/if-this-then-node/modules/xml-rpc-api-handler');

var config = require('/Users/VT/github/Jibo-IFTTT-master/node_modules/if-this-then-node/config.js').getConfig();

var log = bunyan.createLogger({name: 'IFTTN'});
var app = express();

app.use(express.json());
app.use(express.urlencoded());
app.use(xmlparser());

helper.setLogger(log);
helper.checkConfig();

pluginManager.setLogger(log);
pluginManager.loadPlugins();

xmlRpcApiHandler.setLogger(log);
xmlRpcApiHandler.setPluginManager(pluginManager);

// Middleware to log every request
app.use(function (req, res, next) {
  log.info('%s from %s on %s', req.method, req.ip, req.path);
  next();
});

app.get('/ifttn/', function (req, res, next) {
  res.send('<a href="https://github.com/sebauer/if-this-then-node" target="_blank">IFTTN - if-this-then-node</a> Version ' + helper.getVersion() + ' is up and running!');
});

app.post('/ifttn/', function (req, res, next) {
  log.info('Request received');

  xmlRpcApiHandler.handleRequest(req, res);
});
//1337
var server = app.listen(1337, function () {
  log.info('Listening on port %d', server.address().port);
  console.log( 'Listening on port %d', server.address().port);
});






jibo.init('face', function(err) {
    if (err) {
        return console.error(err);
    }
    // Load and create the behavior tree
    let root = jibo.bt.create('../behaviors/main');
    root.start();

    // Listen for the jibo main update loop
    jibo.timer.on('update', function(elapsed) {
        // If the tree is in progress, keep updating
        if (root.status === Status.IN_PROGRESS) {
            root.update();
        }
    });
});



//npm install --save git+https://github.com/JoshOldenburg-graveyard/noip-updater.git

//npm install --save git+https://myrepo.com/stash/scm/myproject/my-project.git
