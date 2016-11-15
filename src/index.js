'use strict';

var Model = require('./model');
var BookKeeper = require('./workers/book-keeper');
var EmailClient = require('./workers/email-client');
let jibo = require ('jibo');
let Status = jibo.bt.Status;

jibo.init('face', function(err) {
    if (err) {
        return console.error(err);
    }
    // Load and create the behavior tree
    let root = jibo.bt.create('../behaviors/groove');
    root.start();

    jibo._model = new Model();
    jibo._keeper = new BookKeeper();
    jibo._email = new EmailClient();

    // Listen for the jibo main update loop
    var time = 0;
    jibo.timer.on('update', function(elapsed) {
        // If the tree is in progress, keep updating
        if (root.status === Status.IN_PROGRESS) {
            root.update();
        }

        time += elapsed;
        if (time > 1000) {
            time -= 1000;
            jibo._model.ready();
            jibo._keeper.ready();
            jibo._email.ready();
        }
    });
});
