'use strict';

let jibo = require('jibo');
let Status = jibo.bt.Status;
let EventBus = require('./core/event/event-bus');
let Controller = require('./core/controller');

jibo.init('face', function (err) {
    if (err) {
        return console.error(err);
    }

    // Load and create the behavior tree
    let root = jibo.bt.create('../behaviors/main');
    let eventBus = new EventBus(root.emitter);
    let controller = new Controller(eventBus);

    //  Pass any needed objects to main's notepad
    root.notepad = {
        controller: controller
    };

    // Listen for the jibo main update loop
    root.start();
    jibo.timer.on('update', function () {
        // If the tree is in progress, keep updating
        if (root.status === Status.IN_PROGRESS) {
            root.update();
        }
    });
});
