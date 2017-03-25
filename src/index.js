"use strict";

let jibo = require ('jibo');
let Status = jibo.bt.Status;

var EventBus = require('./core/event/event-bus');
var Controller = require('./core/controller');
var Model = require('./model');
var BookKeeper = require('./core/book-keeper');
var EmailClient = require('./core/email-client');
var Util = require('./util');

jibo.init('face', function(err) {
    if (err) {
        return console.error(err);
    }

    // Load and create the behavior tree
    let root = jibo.bt.create('../behaviors/main');
    root.start();

    var eventBus = new EventBus();
    var controller = new Controller(eventBus);

    // Listen for the jibo main update loop
    jibo.timer.on('update', function(elapsed) {
        // If the tree is in progress, keep updating
        if (root.status === Status.IN_PROGRESS) {
            root.update();
        }
    });
});
