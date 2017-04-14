'use strict';

var jibo = require('jibo');
var Status = jibo.bt.Status;
var EventBus = require('./core/event/event-bus');
var Controller = require('./core/controller');
var Notepad = require('./notepad');
var testEvents = require('../test/test-events');
var events = require('./core/event/event');
var util = require('./util');
var _ = require('lodash');
var async = require('async');

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

    //  Add some fake events to test on
    controller._model._clearDatabase(function () {
        var funcs = [];
        testEvents.forEach(function (evt) {
            funcs.push(function (cb) {
                eventBus.emitEvent(events.DATABASE_ADD, {
                    type: util.COLLECTION_TYPE.EVENTS,
                    subtype: 'default',
                    doc: _.cloneDeep(evt),
                    _cb: cb
                });
            });
        });
        async.parallel(funcs, function (err) {
            if (err) {
                console.err('Some problem adding fake events: ' + err);
            } else {
                //  Add to blackboard, global var across all behaviors
                root.blackboard.eventBus = eventBus;
                root.blackboard.controller = controller;

                // Listen for the jibo main update loop
                root.start();
                jibo.timer.on('update', function () {
                    // If the tree is in progress, keep updating
                    if (root.status === Status.IN_PROGRESS) {
                        root.update();
                    }
                });
            }
        });
    });
});
