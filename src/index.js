'use strict';

var jibo = require('jibo');
var Status = jibo.bt.Status;
var EventBus = require('./core/event/event-bus');
var Controller = require('./core/controller');
var Notepad = require('./notepad');

jibo.init('face', function (err) {
    if (err) {
        return console.error(err);
    }

    // Load and create the behavior tree
    var root = jibo.bt.create('../behaviors/main', {
        notepad: new Notepad()
    });
    var eventBus = new EventBus(root.emitter);
    var controller = new Controller(eventBus);

    //  Pass any needed objects to main's notepad
    root.notepad.addItem({
        name: 'EventBus',
        item: eventBus,
        overwrite: false,
        permanent: true
    });
    root.notepad.addItem({
        name: 'Controller',
        item: controller,
        overwrite: false,
        permanent: true
    });

    setTimeout(function () {
        eventBus.emitJiboEvent('INTERRUPT_IDLE', {
            type: 'reminder'
        });
    }, 2000);

    // Listen for the jibo main update loop
    root.start();
    jibo.timer.on('update', function () {
        // If the tree is in progress, keep updating
        if (root.status === Status.IN_PROGRESS) {
            root.update();
        }
    });
});
