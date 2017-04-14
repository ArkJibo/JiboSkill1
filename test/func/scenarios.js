/*global describe, it, before, beforeEach, afterEach*/
/*jshint expr: true*/

'use strict';

var proxyquire = require('proxyquire');

var Controller = proxyquire('../../src/core/controller', {
    './email-client': class EmailClient {}  //  Fake client so it doesn't try to connect online
});
var EventBus = require('../../src/core/event/event-bus');
var events = require('../../src/core/event/event');
var util = require('../../src/util');
var testEvents = require('../test-events');

var expect = require('chai').expect;
var async = require('async');
var moment = require('moment');
var _ = require('lodash');

var addCalendarEvents = function (eventBus, cb) {
    //  Add the calendar events
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
        expect(err).to.not.exist;
        cb();
    });
};

describe('Scenario Based Functional Tests', function () {
    var eventBus, controller;
    before(function () {
        eventBus = new EventBus();
        controller = new Controller(eventBus);
    });

    afterEach(function (done) {
        //  Clear contents of each temp db file
        controller._model._clearDatabase(function (err) {
            expect(err).to.not.exist;
            done();
        });
    });

    describe('Handling reminders of calendar events', function () {
        beforeEach(function (done) {
            addCalendarEvents(eventBus, done);
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
                                    expect(reminder).to.be.null;
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

        it('should correctly repeat reminders that are not flagged', function (done) {
            eventBus.emitEvent(events.FILL_REMINDER_QUEUE, {
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(16);

                    //  Get first reminder for comparison
                    eventBus.emitEvent(events.FETCH_NEXT_REMINDER, {
                        _cb: function (err, reminder) {
                            expect(err).to.not.exist;

                            var currReminder = reminder;
                            var flagged = false;

                            // Get reminders until no more
                            async.forever(function (next) {
                                //  Keep getting next reminder
                                eventBus.emitEvent(events.FETCH_NEXT_REMINDER, {
                                    _cb: function (err, reminder) {
                                        expect(err).to.not.exist;
                                        if (!reminder) {
                                            //  Out of reminders, end the loop
                                            next('all done');
                                        } else {
                                            currReminder = flagged ? reminder : currReminder;
                                            expect(reminder).to.eql(currReminder);

                                            //  50/50 chance to flag reminder
                                            if (Math.random() >= 0.5) {
                                                //  Flag it
                                                flagged = true;
                                                eventBus.emitEvent(events.FLAG_REMINDER, {
                                                    id: reminder._id,
                                                    _cb: function (err) {
                                                        expect(err).to.not.exist;
                                                        next();
                                                    }
                                                });
                                            } else {
                                                flagged = false;
                                                next();
                                            }
                                        }
                                    }
                                });
                            }, function () {
                                //  No more reminders
                                done();
                            });
                        }
                    });
                }
            });
        });
    });

    describe('Scheduling tests of calendar events', function () {
        beforeEach(function (done) {
            addCalendarEvents(eventBus, done);
        });

        it('should get correct schedule for today', function (done) {
            eventBus.emitEvent(events.FETCH_SCHEDULE, {
                day: moment(),
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(4);
                    expect(docs[0].type).to.equal('eating');
                    expect(docs[1].type).to.equal('appointment');
                    expect(docs[2].type).to.equal('exercise');
                    expect(docs[3].type).to.equal('medication');
                    done();
                }
            });
        });

        it('should get correct schedule for future', function (done) {
            eventBus.emitEvent(events.FETCH_SCHEDULE, {
                day: moment().add(2, 'days'),
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(5);
                    expect(docs[0].type).to.equal('exercise');
                    expect(docs[1].type).to.equal('eating');
                    expect(docs[2].type).to.equal('bill');
                    expect(docs[3].type).to.equal('exercise');
                    expect(docs[4].type).to.equal('medication');
                    done();
                }
            });
        });
    });
});
