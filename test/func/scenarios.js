/*global describe, it, before, beforeEach, after, afterEach*/
/*jshint expr: true*/

'use strict';

var proxyquire = require('proxyquire');

var Controller = proxyquire('../../src/core/controller', {
    './email-client': class EmailClient {}  //  Fake client so it doesn't try to connect online
});
var EventBus = require('../../src/core/event/event-bus');
var events = require('../../src/core/event/event');
var util = require('../../src/util');
var testEvents = require('./test-events');

var expect = require('chai').expect;
var async = require('async');
var moment = require('moment');

describe('Scenario Based Functional Tests', function () {
    var eventBus, controller;
    before(function () {
        eventBus = new EventBus();
        controller = new Controller(eventBus);
    });

    afterEach(function (done) {
        //  Clear contents of each temp db file
        controller._model._clearDatabase(function (err, results) {
            expect(err).to.not.exist;
            done();
        });
    });

    describe('Queueing reminders based on calendar events', function () {
        before(function (done) {
            //  Add the calendar events
            var funcs = [];
            testEvents.forEach(function (evt) {
                funcs.push(function (cb) {
                    eventBus.emitEvent(events.DATABASE_ADD, {
                        type: util.COLLECTION_TYPE.EVENTS,
                        subtype: 'default',
                        doc: evt,
                        _cb: cb
                    });
                });
            });

            async.parallel(funcs, function (err, docs) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should have created correct reminders', function (done) {
            var dayStart = moment().startOf('day');

            eventBus.emitEvent(events.FILL_REMINDER_QUEUE, {
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(16);

                    var expectedTimes = [
                        moment(dayStart).add(8, 'hours').format('x'),
                        moment(dayStart).add(9, 'hours').format('x'),
                        moment(dayStart).add(9, 'hours').format('x'),
                        moment(dayStart).add(9, 'hours').add(20, 'minutes').format('x'),
                        moment(dayStart).add(9, 'hours').add(40, 'minutes').format('x'),
                        moment(dayStart).add(10, 'hours').format('x'),
                        moment(dayStart).add(11, 'hours').format('x'),
                        moment(dayStart).add(13, 'hours').format('x'),
                        moment(dayStart).add(13, 'hours').add(30, 'minutes').format('x'),
                        moment(dayStart).add(14, 'hours').format('x'),
                        moment(dayStart).add(14, 'hours').format('x'),
                        moment(dayStart).add(14, 'hours').add(15, 'minutes').format('x'),
                        moment(dayStart).add(14, 'hours').add(30, 'minutes').format('x'),
                        moment(dayStart).add(14, 'hours').add(30, 'minutes').format('x'),
                        moment(dayStart).add(15, 'hours').format('x'),
                        moment(dayStart).add(15, 'hours').add(30, 'minutes').format('x')
                    ];

                    //  Emits get next reminder event
                    var emit = function (i, cb) {
                        eventBus.emitEvent(events.FETCH_NEXT_REMINDER, {
                            _cb: function (err, reminder) {
                                expect(err).to.not.exist;

                                if (i >= docs.length) {
                                    //  Just to make sure all reminders get flagged
                                    expect(reminder.length).to.equal(0);
                                    cb();
                                } else {
                                    expect(reminder.time).to.equal(expectedTimes[i]);

                                    //  Set reminder as viewed
                                    eventBus.emitEvent(events.FLAG_REMINDER, {
                                        id: reminder._id,
                                        _cb: function (err) {
                                            expect(err).to.not.exist;
                                            cb();
                                        }
                                    });
                                }
                            }
                        });
                    };

                    //  getNextReminder should return reminders in correct order
                    var funcs = [];
                    for (var i = 0; i < docs.length + 1; i++) {
                        funcs.push(emit.bind(null, i));
                    }

                    async.series(funcs, function () {
                        done();
                    });
                }
            });
        });
    });
});
