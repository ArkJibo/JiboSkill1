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
    let root = jibo.bt.create('../behaviors/groove');
    root.start();

    jibo.eventBus = new EventBus();
    jibo.controller = new Controller(jibo.eventBus);

    // Listen for the jibo main update loop
    jibo.timer.on('update', function(elapsed) {
        // If the tree is in progress, keep updating
        if (root.status === Status.IN_PROGRESS) {
            root.update();
        }
    });
});
