/* global describe, it, before, beforeEach, after, afterEach */
/*jshint expr: true*/

'use strict';

var proxyquire = require('proxyquire');

var Controller = proxyquire('../../src/core/controller', {
    './email-client': class EmailClient {}  //  Fake client so it doesn't try to connect online
});
var EventBus = require('../../src/core/event/event-bus');
var events = require('../../src/core/event/event');
var util = require('../../src/util');
var errors = require('../../src/errors');
var fs = require('fs');
var async = require('async');
var Datastore = require('nedb');
var expect = require('chai').expect;
var moment = require('moment');

describe('Controller', function () {
    var eventBus;
    var controller;
    var presentTime = moment();

    before(function () {
        eventBus = new EventBus();
        controller = new Controller(eventBus);
    });

    var tempFiles = {
        'events': './db/test-events.db',
        'reminderQueue': './db/test-reminderQueue.db',
        'inventory': './db/test-inventory.db',
        'patient': './db/test-patient.db',
        'people': './db/test-people.db',
        'media': './db/test-media.db',
        'entertainment': './db/test-entertainment.db',
        'voice': './db/test-voice.db',
        'credentials': './db/test-credentials.db'
    };

    afterEach(function (done) {
        //  Clear contents of each temp db file
        controller._model._clearDatabase(function (err, results) {
            expect(err).to.not.exist;
            done();
        });
    });

    describe('#_receivedEmail()', function () {
        before(function (done) {
            controller._email = 'fancyhuman@gmail.com';
            controller._model._db.credentials.insert([{
                type: 'update-password',
                password: 'funtimes'
            }, {
                type: 'update-password',
                password: 'buntimes'
            }], function (err, docs) {
                expect(err).to.not.exist;

                controller._model._db.events.insert({
                    deez: 'nuts'
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        it('should correctly update database for db update email', function (done) {
            var flags = [false, false];
            eventBus.addOnceEventListener(events.SEND_EMAIL, null, function (email) {
                expect(email.to).to.equal('random@gmail.com');
                expect(email.subject).to.equal('[JIBO DATABASE UPDATE CONFIRMATION] For update "Awesome Update"');

                var subs = email.body.split('Document added:');
                expect(subs.length - 1).to.equal(2);
                expect(email.body.indexOf('# documents removed: 1')).to.be.at.least(0);
                expect(email.body.indexOf('# documents modified: 2')).to.be.at.least(0);

                flags[0] = true;
                if (flags[0] && flags[1]) {
                    done();
                }
            });

            eventBus.emitEvent(events.RECEIVED_EMAIL, {
                fromEmail: 'random@gmail.com',
                fromFirstName: 'Yuge',
                fromLastName: 'Trump',
                subject: '[' + util.EMAIL_DB_UPDATE_TAG + '] Awesome Update',
                body: '{' +
                    '"PasSword": "funtimes",' +
                    '"ADD": [{' +
                        '"_collection": "patient",' +
                        '"_docType": "default",' +
                        '"type": "filler",' +
                        '"subtype": "filler",' +
                        '"value": "filler"' +
                    '}, {' +
                        '"_collection": "inventory",' +
                        '"_docType": "supply",' +
                        '"type": "more filler",' +
                        '"name": "more filler",' +
                        '"amount": "more filler"' +
                    '}],' +
                    '"RemoVE": {' +
                        '"_collection": "events",' +
                        '"deez": "nuts"' +
                    '},' +
                    '"MoDiFy": {' +
                        '"_collection": "credentials",' +
                        '"match": {' +
                            '"type": "update-password"' +
                        '},' +
                        '"CHANges": {' +
                            '"password": "HACKED"' +
                        '}' +
                    '}' +
                '}',
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(4);
                    expect(docs[0].add[0].type).to.equal('filler');
                    expect(docs[0].add[0].subtype).to.equal('filler');
                    expect(docs[0].add[0].value).to.equal('filler');
                    expect(docs[1].add[0].type).to.equal('more filler');
                    expect(docs[1].add[0].name).to.equal('more filler');
                    expect(docs[1].add[0].amount).to.equal('more filler');
                    expect(docs[2].remove).to.equal(1);
                    expect(docs[3].modify).to.equal(2);

                    flags[1] = true;
                    if (flags[0] && flags[1]) {
                        done();
                    }
                }
            });
        });

        it('should fail because wrong password', function (done) {
            var flags = [false, false];
            eventBus.addEventListener(events.SEND_EMAIL, null, function (email) {
                expect(email.subject).to.include('[JIBO DATABASE UPDATE FAILURE]');
                expect(email.body).to.equal('Incorrect password');

                flags[0] = true;
                if (flags[0] && flags[1]) {
                    done();
                }
            });

            eventBus.emitEvent(events.RECEIVED_EMAIL, {
                fromEmail: 'random@gmail.com',
                fromFirstName: 'Yuge',
                fromLastName: 'Trump',
                subject: '[' + util.EMAIL_DB_UPDATE_TAG + '] Awesome Update',
                body: '{' +
                    '"PasSword": "wrong password"' +
                '}',
                _cb: function (err, docs) {
                    expect(err).to.equal('Incorrect password');
                    expect(docs).to.not.exist;

                    flags[1] = true;
                    if (flags[0] && flags[1]) {
                        done();
                    }
                }
            });
        });

        it('should correct update database for regular email', function (done) {
            eventBus.emitEvent(events.RECEIVED_EMAIL, {
                fromEmail: 'random@gmail.com',
                fromFirstName: 'Yuge',
                fromLastName: 'Trump',
                subject: 'Everything is just fantastic',
                body: 'Absolutely fantastic',
                date: presentTime.format('x'),
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs[0].fromEmail).to.equal('random@gmail.com');
                    done();
                }
            });
        });
    });

    describe('#_fetchSchedule()', function () {
        it('should get schedule from model and cb', function (done) {
            eventBus.emitEvent(events.FETCH_SCHEDULE, {
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(0);
                    done();
                }
            });
        });
    });

    describe('#_stimulateMemory()', function () {
        it('should fetch correct media', function (done) {
            //  Manually insert docs
            controller._model._db[util.COLLECTION_TYPE.MEDIA].insert([{
                type: 'photo',
                timesViewed: 3
            }, {
                type: 'photo',
                timesViewed: 1
            }, {
                type: 'video',
                timesViewed: 2
            }], function (err, docs) {
                expect(err).to.not.exist;

                eventBus.emitEvent(events.STIMULATE_MEMORY, {
                    type: util.MEM_STIMULANT.MEDIA,
                    _cb: function (err, docs) {
                        expect(err).to.not.exist;
                        expect(docs.type).to.equal('photo');
                        expect(docs.timesViewed).to.equal(1);
                        done();
                    }
                });
            });
        });

        it('should be ok if no media available', function (done) {
            eventBus.emitEvent(events.STIMULATE_MEMORY, {
                type: util.MEM_STIMULANT.MEDIA,
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs).to.not.exist;
                    done();
                }
            });
        });

        it('should fetch correct trivia', function (done) {
            //  Manually insert docs
            controller._model._db[util.COLLECTION_TYPE.PEOPLE].insert([{
                first: 'Bob',
                last: 'Marley',
                relationship: 'friend',
                birthday: presentTime.format('x'),
                closeness: 8
            }, {
                first: 'Joe',
                last: 'Campbell',
                relationship: 'advisor',
                birthday: presentTime.format('x'),
                closeness: 2
            }, {
                first: 'Sally',
                last: 'Chen',
                relationship: 'sister-in-law',
                birthday: presentTime.format('x'),
                closeness: 9
            }], function (err, docs) {
                expect(err).to.not.exist;

                eventBus.emitEvent(events.STIMULATE_MEMORY, {
                    type: util.MEM_STIMULANT.TRIVIA,
                    _cb: function (err, trivia) {
                        expect(err).to.not.exist;

                        if (trivia.question.includes('first name?')) {
                            expect(['Bob', 'Sally']).to.include(trivia.answer);
                        } else if (trivia.question.includes('last name?')) {
                            expect(['Marley', 'Chen']).to.include(trivia.answer);
                        } else if (trivia.question.includes('your relationship with')) {
                            expect(['friend', 'sister-in-law']).to.include(trivia.answer);
                        } else {
                            expect(trivia.answer).to.equal(presentTime.format('x'));
                        }

                        done();
                    }
                });
            });
        });

        it('should fetch correct trivia with all closeness < 5', function (done) {
            //  Manually insert docs
            controller._model._db[util.COLLECTION_TYPE.PEOPLE].insert([{
                first: 'Bob',
                last: 'Marley',
                relationship: 'friend',
                birthday: presentTime.format('x'),
                closeness: 3
            }, {
                first: 'Joe',
                last: 'Campbell',
                relationship: 'advisor',
                birthday: presentTime.format('x'),
                closeness: 2
            }, {
                first: 'Sally',
                last: 'Chen',
                relationship: 'sister-in-law',
                birthday: presentTime.format('x'),
                closeness: 2
            }], function (err, docs) {
                expect(err).to.not.exist;

                eventBus.emitEvent(events.STIMULATE_MEMORY, {
                    type: util.MEM_STIMULANT.TRIVIA,
                    _cb: function (err, trivia) {
                        expect(err).to.not.exist;

                        if (trivia.question.includes('first name?')) {
                            expect(['Bob', 'Joe', 'Sally']).to.include(trivia.answer);
                        } else if (trivia.question.includes('last name?')) {
                            expect(['Marley', 'Campbell', 'Chen']).to.include(trivia.answer);
                        } else if (trivia.question.includes('your relationship with')) {
                            expect(['friend', 'advisor', 'sister-in-law']).to.include(trivia.answer);
                        } else {
                            expect(trivia.answer).to.equal(presentTime.format('x'));
                        }

                        done();
                    }
                });
            });
        });
    });

    describe('#_fetchNextReminder()', function () {
        it('should pass on the call to model', function (done) {
            eventBus.emitEvent(events.FETCH_NEXT_REMINDER, {
                _cb: function (err, reminder) {
                    expect(err).to.not.exist;
                    expect(reminder).to.be.null;
                    done();
                }
            });
        });
    });

    describe('#_fillReminderQueue()', function () {
        it('should pass on the call to model', function (done) {
            eventBus.emitEvent(events.FILL_REMINDER_QUEUE, {
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(1);
                    expect(docs[0].length).to.equal(0);
                    done();
                }
            });
        });
    });

    describe('#_flagReminder()', function () {
        it('should pass on the call to model', function (done) {
            eventBus.emitEvent(events.FLAG_REMINDER, {
                id: 'RANDOMID',
                _cb: function (err, docs) {
                    expect(err).to.equal(errors.INVALID_DOC_ID);
                    expect(docs).to.not.exist;
                    done();
                }
            });
        });
    });

    describe('#_unknownUserInput()', function () {
        it('should pass on the call to model', function (done) {
            eventBus.emitEvent(events.UNKNOWN_USER_INPUT, {
                input: 'I said something super confusing',
                date: presentTime.format('x'),
                _cb: function () {
                    done();
                }
            });
        });
    });

    describe('#_fetchFromDatabase()', function () {
        it('should trigger listener and receive callback', function (done) {
            eventBus.emitEvent(events.DATABASE_FETCH, {
                type: 'inventory',
                fetchParams: {},
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(0);
                    done();
                }
            });
        });
    });

    describe('#_updateDatabase()', function () {
        it('should trigger listener and receive callback', function (done) {
            eventBus.emitEvent(events.DATABASE_UPDATE, {
                type: util.COLLECTION_TYPE.EVENTS,
                params: {},
                updates: {},
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs).to.equal(0);
                    done();
                }
            });
        });
    });

    describe('#_addToDatabase()', function () {
        it('should trigger listener and receive callback', function (done) {
            eventBus.emitEvent(events.DATABASE_ADD, {
                type: util.COLLECTION_TYPE.INVENTORY,
                subtype: 'supply',
                doc: {
                    type: 'electronics',
                    name: 'headphones',
                    amount: '100'
                },
                _cb: function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(1);
                    done();
                }
            });
        });
    });

    describe('#_removeFromDatabase()', function () {
        it('should trigger listener and receive callback', function (done) {
            eventBus.emitEvent(events.DATABASE_REMOVE, {
                type: util.COLLECTION_TYPE.INVENTORY,
                params: {},
                _cb: function (err, numRemoved) {
                    expect(err).to.not.exist;
                    expect(numRemoved).to.equal(0);
                    done();
                }
            });
        });
    });
});
