/* global describe, it, before, beforeEach, after, afterEach */
/*jshint expr: true*/

'use strict';

var assert = require('assert');
var Datastore = require('nedb');
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var Model = require('../../src/model');
var errors = require('../../src/errors');
var expect = require('chai').expect;
var util = require('../../src/util');
var _ = require('lodash');

describe('Model', function () {
    var model = new Model();
    var tempFiles = {};
    tempFiles[util.COLLECTION_TYPE.EVENTS] = './db/test-events.db';
    tempFiles[util.COLLECTION_TYPE.REMINDER_QUEUE] = './db/test-reminderQueue.db';
    tempFiles[util.COLLECTION_TYPE.INVENTORY] = './db/test-inventory.db';
    tempFiles[util.COLLECTION_TYPE.PATIENT] = './db/test-patient.db';
    tempFiles[util.COLLECTION_TYPE.PEOPLE] = './db/test-people.db';
    tempFiles[util.COLLECTION_TYPE.MEDIA] = './db/test-media.db';
    tempFiles[util.COLLECTION_TYPE.ENTERTAINMENT] = './db/test-entertainment.db';
    tempFiles[util.COLLECTION_TYPE.VOICE] = './db/test-voice.db';
    tempFiles[util.COLLECTION_TYPE.CREDS] = './db/test-credentials.db';
    tempFiles[util.COLLECTION_TYPE.EMAIL] = './db/test-emails.db';

    var cleanup = function (cb) {
        //  Delete the temp db files
        var funcs = [];
        Object.keys(tempFiles).forEach(function (key) {
            funcs.push(function(cb) {
                fs.unlink(tempFiles[key], function (err) {
                    expect(err).to.not.exist;
                    cb();
                });
            });
        });
        async.parallel(funcs, cb);
    };

    //  For cleaning up on ctrl+c
    var rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.on('SIGINT', function () {
        cleanup(function () {
            process.exit();
        });
    });

    before(function (done) {
        //  Use temporary db files for testing
        var functions = [];
        Object.keys(tempFiles).forEach(key => {
            model._db[key] = new Datastore(tempFiles[key]);
            functions.push(function (cb) {
                model._db[key].loadDatabase();
                cb();
            });
        });
        async.parallel(functions, done);
    });

    after(function () {
        cleanup(function () {
            console.log('\n***NOTE: YOU CAN IGNORE THE DEPRECATION WARNING ABOUT ISO FORMAT');
        });
    });

    afterEach(function (done) {
        //  Clear contents of each temp db file
        var functions = [];
        Object.keys(tempFiles).forEach(function (key) {
            functions.push(function (cb) {
                model._db[key].remove({}, { multi: true }, cb);
            });
        });

        async.parallel(functions, function (err, results) {
            assert.equal(err, null);
            done();
        });
    });

    var presentTime = moment().format();
    var mockRemind = {
        type: 'much winning',
        numReminders: 1337,
        interval: '3y',
        startTime: presentTime
    };

    var fillTodayEvents = function (done) {
        var start = moment().startOf('day');
        //  Insert test set of events
        model._db.events.insert([{
            type: 'fun',
            time: moment(start).add(5, 'hours').toISOString(),
            reminderInfo: {
                numReminders: 2,
                interval: {
                    value: 1,
                    modifier: 'h'
                },
                startTime: moment(start).add(2, 'hours').toISOString()
            }
        }, {
            type: 'run',
            time: moment(start).add(7, 'hours').toISOString(),
            reminderInfo: {
                numReminders: 2,
                interval: {
                    value: 2,
                    modifier: 'h'
                },
                startTime: moment(start).add(1, 'hours').toISOString()
            }
        }, {
            type: 'bun',
            time: moment(start).add(9, 'hours').toISOString(),
            reminderInfo: {
                numReminders: 3,
                interval: {
                    value: 2,
                    modifier: 'h'
                },
                startTime: moment(start).add(2, 'hours').toISOString()
            }
        }, {
            type: 'stun',
            time: moment(start).add(2, 'days').toISOString(),
            reminderInfo: {
                numReminders: 1,
                interval: {
                    value: 1,
                    modifier: 'h'
                },
                startTime: moment(start)
            }
        }, {
            type: 'hun',
            time: moment(start).subtract(1, 'days').toISOString(),
            reminderInfo: {
                numReminders: 1,
                interval: {
                    value: 1,
                    modifier: 'h'
                },
                startTime: moment(start)
            }
        }], function (err, docs) {
            expect(err).to.not.exist;
            done();
        });
    };

    describe('#fillTodayReminderQueue()', function () {
        before(function (done) {
            fillTodayEvents(done);
        });

        it('should fill the correct reminders', function (done) {
            model.fillTodayReminderQueue(function (err, docs) {
                expect(err).to.not.exist;
                expect(docs.length).to.equal(7);

                var start = moment().startOf('day');
                expect(docs[0].type).to.equal('fun');
                expect(docs[0].time).to.equal(moment(start).add(2, 'hours').toISOString());
                expect(docs[1].type).to.equal('fun');
                expect(docs[1].time).to.equal(moment(start).add(3, 'hours').toISOString());
                expect(docs[2].type).to.equal('run');
                expect(docs[2].time).to.equal(moment(start).add(1, 'hours').toISOString());
                expect(docs[3].type).to.equal('run');
                expect(docs[3].time).to.equal(moment(start).add(3, 'hours').toISOString());
                expect(docs[4].type).to.equal('bun');
                expect(docs[4].time).to.equal(moment(start).add(2, 'hours').toISOString());
                expect(docs[5].type).to.equal('bun');
                expect(docs[5].time).to.equal(moment(start).add(4, 'hours').toISOString());
                expect(docs[6].type).to.equal('bun');
                expect(docs[6].time).to.equal(moment(start).add(6, 'hours').toISOString());
                done();
            });
        });
    });

    describe('#getTodaySchedule()', function () {
        before(function (done) {
            fillTodayEvents(done);
        });

        it('should return 3 events for today', function (done) {
            model.getTodaySchedule(function (err, docs) {
                expect(err).to.not.exist;
                expect(docs.length).to.equal(3);
                expect(docs[0].type).to.equal('fun');
                expect(docs[1].type).to.equal('run');
                expect(docs[2].type).to.equal('bun');
                done();
            });
        });
    });

    describe('#getNextMatchingEvent()', function () {
        it('should get correct event', function (done) {
            //  Manually insert
            model._db.events.insert([{
                type: 'appointment',
                name: 'fire',
                value: 1,
                time: moment(presentTime).add(1, 'days').toISOString()
            }, {
                type: 'medical',
                name: 'fire',
                value: 2,
                time: moment(presentTime).add(2, 'days').toISOString()
            }, {
                type: 'appointment',
                name: 'water',
                value: 3,
                time: moment(presentTime).add(3, 'days').toISOString()
            }, {
                type: 'appointment',
                name: 'water',
                value: 4,
                time: moment(presentTime).add(4, 'days').toISOString()
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getNextMatchingEvent(util.EVENT_TYPE.APPOINTMENT, {
                    name: 'water'
                }, function (err, doc) {
                    expect(err).to.not.exist;
                    expect(doc.name).to.equal('water');
                    expect(doc.value).to.equal(3);
                    done();
                });
            });
        });

        it('should not break for invalid collection', function (done) {
            model.getNextMatchingEvent('garbage', {}, function (err, doc) {
                expect(err).to.not.exist;
                expect(doc).to.not.exist;
                done();
            });
        });
    });

    describe('#getMatchingCollectionDocs()', function () {
        it('should return proper matches', function (done) {
            //  Manually insert docs
            model._db.events.insert([{
                type: 'hype',
                level: 25,
                fire: 5
            }, {
                type: 'hype',
                level: 10,
                fire: 15
            }, {
                type: 'hype',
                level: 30,
                fire: 20
            }, {
                type: 'pipe',
                level: 9000,
                fire: 1
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getMatchingCollectionDocs('events', {
                    type: 'hype',
                    _custom: [{
                        key: 'level',
                        op: 'gt',
                        value: 10
                    }, {
                        key: 'fire',
                        op: 'lte',
                        value: 5
                    }]
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(1);
                    expect(docs[0].type).to.equal('hype');
                    expect(docs[0].level).to.equal(25);
                    expect(docs[0].fire).to.equal(5);
                    done();
                });
            });
        });

        it('should return INVALID_COLLECTION error', function (done) {
            model.getMatchingCollectionDocs('random', {}, function (err, docs) {
                expect(err).to.equal(errors.INVALID_COLLECTION);
                expect(docs).to.not.exist;
                done();
            });
        });
    });

    describe('#getNextReminder()', function () {
        it('should get correct reminder', function (done) {
            //  Manually insert
            model._db.reminderQueue.insert([{
                name: 'event1',
                time: moment(presentTime).add(1, 'hours').toISOString()
            }, {
                name: 'event2',
                time: moment(presentTime).add(2, 'hours').toISOString()
            }, {
                name: 'event3',
                time: moment(presentTime).add(3, 'hours').toISOString()
            }, {
                name: 'event4',
                time: moment(presentTime).add(4, 'hours').toISOString()
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getNextReminder(function (err, doc) {
                    expect(err).to.not.exist;
                    expect(doc.name).to.equal('event1');
                    done();
                });
            });
        });

        it('should get correct reminder and clear past reminders', function (done) {
            //  Manually insert
            model._db.reminderQueue.insert([{
                name: 'event1',
                time: moment(presentTime).subtract(2, 'days').toISOString(),
                viewed: true
            }, {
                name: 'event2',
                time: moment(presentTime).subtract(1, 'days').toISOString(),
                viewed: false
            }, {
                name: 'event3',
                time: moment(presentTime).add(1, 'days').toISOString()
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getNextReminder(function (err, doc) {
                    expect(err).to.not.exist;
                    expect(doc.name).to.equal('event2');
                    done();
                });
            });
        });

        it('should not break if no reminders', function (done) {
            model.getNextReminder(function (err, docs) {
                expect(err).to.not.exist;
                expect(docs.length).to.equal(0);
                done();
            });
        });
    });

    describe('#setReminderViewed()', function () {
        it('should set flag correctly', function (done) {
            model._db.reminderQueue.insert({
                _id: '1234567890',
                viewed: false
            }, function (err, docs) {
                expect(err).to.not.exist;

                model.setReminderViewed('1234567890', function (err, numAffected, affectedDocs) {
                    expect(err).to.not.exist;
                    expect(numAffected).to.equal(1);
                    expect(affectedDocs[0].viewed).to.be.true;
                    done();
                });
            });
        });

        it('should get invalid ID error', function (done) {
            model._db.reminderQueue.insert({
                _id: '1234567890',
                viewed: false
            }, function (err, docs) {
                expect(err).to.not.exist;

                model.setReminderViewed('asdfasdf', function (err, numAffected, affectedDocs) {
                    expect(err).to.equal(errors.INVALID_DOC_ID);
                    expect(numAffected).to.not.exist;
                    expect(affectedDocs).to.not.exist;
                    done();
                });
            });
        });
    });

    describe('#updateCollection()', function () {
        beforeEach(function (done) {
            //  Clear collection and manually insert docs to update
            model._db.events.remove({}, {
                multi: true
            }, function (err) {
                expect(err).to.not.exist;

                model._db.events.insert([{
                    key1: 'a',
                    key2: 1,
                    key3: 'dummy'
                }, {
                    key1: 'a',
                    key2: 5,
                    key3: 'dummy'
                }, {
                    key1: 'b',
                    key2: 3,
                    key3: 'dummy'
                }, {
                    key1: 'b',
                    key2: 7,
                    key3: 'dummy'
                }], function (err, docs) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        it('should update by replacing matches with new doc', function (done) {
            model.updateCollection(util.COLLECTION_TYPE.EVENTS, {
                key1: 'a'
            }, {
                replace1: 'z',
                replace2: 42
            }, function (err, numAffected, docs) {
                expect(err).to.not.exist;
                expect(numAffected).to.equal(2);
                expect(docs[0].replace1).to.equal('z');
                expect(docs[0].replace2).to.equal(42);
                expect(docs[1].replace1).to.equal('z');
                expect(docs[1].replace2).to.equal(42);
                expect(docs[0].key1).to.not.exist;
                expect(docs[0].key2).to.not.exist;
                expect(docs[1].key1).to.not.exist;
                expect(docs[1].key2).to.not.exist;
                done();
            });
        });

        it('should update by performing ops', function (done) {
            model.updateCollection(util.COLLECTION_TYPE.EVENTS, {
                _custom: [{
                    key: 'key2',
                    op: 'gt',
                    value: 1
                }]
            }, {
                _set: {
                    key1: 'z',
                },
                _unset: {
                    key3: true
                },
                _inc: {
                    key2: 5
                },
                thisShouldBeIgnored: true
            }, function (err, numAffected, docs) {
                expect(err).to.not.exist;
                expect(numAffected).to.equal(3);
                docs.forEach(function (doc) {
                    expect(doc.key1).to.equal('z');
                    expect(doc.key3).to.not.exist;
                    expect([8, 10, 12]).to.include(doc.key2);
                });
                done();
            });
        });
    });

    describe('#removeFromCollection()', function () {
        it('should remove all of the specified key', function (done) {
            model._db.events.insert([{
                key: 'value'
            }, {
                key: 'value'
            }, {
                key: 'value'
            }, {
                key: 'SUPER VALUE'
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.removeFromCollection(util.COLLECTION_TYPE.EVENTS, {
                    key: 'value'
                }, function (err, numRemoved) {
                    expect(err).to.not.exist;
                    expect(numRemoved).to.equal(3);
                    done();
                });
            });
        });

        it('should remove all the things', function (done) {
            model._db.events.insert([{
                key: 'value'
            }, {
                key: 'value'
            }, {
                key: 'value'
            }, {
                key: 'SUPER VALUE'
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.removeFromCollection(util.COLLECTION_TYPE.EVENTS, {}, function (err, numRemoved) {
                    expect(err).to.not.exist;
                    expect(numRemoved).to.equal(4);
                    done();
                });
            });
        });
    });

    describe('#addNewCollectionDoc()', function () {
        it('should succeed with events and repeatInfo', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.EVENTS, 'default', {
                type: util.EVENT_TYPE.APPOINTMENT,
                subtype: 'medical',
                time: presentTime,
                repeatInfo: {
                    startTime: moment(presentTime).add(1, 'hours').toISOString(),
                    interval: {
                        value: 2,
                        modifier: 'h'
                    },
                    endTime: moment(presentTime).add(5, 'hours').toISOString()
                },
                reminderInfo: mockRemind
            }, function (err, docs) {
                expect(err).to.not.exist;
                expect(docs.length).to.equal(4);
                expect(docs[0].time).to.equal(moment(presentTime).toISOString());
                expect(docs[1].time).to.equal(moment(presentTime).add(1, 'hours').toISOString());
                expect(docs[2].time).to.equal(moment(presentTime).add(3, 'hours').toISOString());
                expect(docs[3].time).to.equal(moment(presentTime).add(5, 'hours').toISOString());
                done();
            });
        });

        it('should succeed with inventory and correct params for supply', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.INVENTORY, 'supply', {
                type: 'grocery',
                name: 'broccoli',
                amount: 5
            }, function (err, docs) {
                expect(err).to.not.exist;
                expect(docs).to.exist;
                done();
            });
        });

        it('should succeed with inventory and correct params for record', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.INVENTORY, 'record', {
                type: 'grocery',
                date: presentTime,
                purchased: [{
                    name: 'broccoli',
                    amount: 5
                }]
            }, function (err, docs) {
                expect(err).to.not.exist;
                expect(docs).to.exist;
                done();
            });
        });

        it('should handle incorrect item type for inventory', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.INVENTORY, 'wat', {}, function (err, docs) {
                expect(err).to.equal(errors.INVALID_INVENTORY);
                expect(docs).to.not.exist;
                done();
            });
        });

        it('should add new Reminder to collection', function (done) {
            //  Manually insert an event
            model._db.events.insert({
                _id: 'alksdjhfi3j928htger'
            }, function (err, docs) {
                expect(err).to.not.exist;

                model.addNewCollectionDoc(util.COLLECTION_TYPE.REMINDER_QUEUE, 'default', {
                    type: 'events',
                    event: {
                        _id: 'alksdjhfi3j928htger'
                    },
                    time: presentTime
                }, function (err, doc) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        it('should fail for missing key in reminder', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.REMINDER_QUEUE, 'default', {
                why: 'tho'
            }, function (err, doc) {
                expect(err).to.equal(errors.KEY_MISSING);
                expect(doc).to.not.exist;
                done();
            });
        });

        it('should fail for bad _id in reminder', function (done) {
            //  Manually insert an event
            model._db.events.insert({
                _id: 'alksdjhfi3j928htger'
            }, function (err, docs) {
                expect(err).to.not.exist;

                model.addNewCollectionDoc(util.COLLECTION_TYPE.REMINDER_QUEUE, 'default', {
                    type: 'events',
                    event: {
                        _id: 'such a terrible id'
                    },
                    time: presentTime
                }, function (err, doc) {
                    expect(err).to.equal(errors.BAD_DOC_ID);
                    expect(doc).to.not.exist;
                    done();
                });
            });
        });

        it('should add new patient info', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.PATIENT, 'default', {
                type: 'favorite',
                subtype: 'game',
                value: 'hopscotch'
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should add new person', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.PEOPLE,'default',  {
                first: 'Eric',
                last: 'Dong',
                relationship: 'bff forever',
                closeness: 10,
                birthday: presentTime
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should add new media', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.MEDIA, 'default', {
                type: 'photo',
                occasion: 'wedding',
                file: 'media/music/banana.mp3',
                timesViewed: 0
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should add new entertainment', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.ENTERTAINMENT, 'default', {
                type: 'riddle',
                dateAdded: presentTime,
                lastUsed: presentTime,
                rating: 2
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should add new voice line', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.VOICE, 'default', {
                type: 'greeting',
                line: 'Greetings adventurer!',
                dateAdded: presentTime
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should add email creds', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.CREDS, 'default', {
                type: 'email-login',
                email: 'random@gmail.com',
                password: 'password'
            }, function (err, docs) {
                expect(err).to.not.exist;
                expect(docs[0].email).to.equal('random@gmail.com');
                expect(docs[0].password).to.equal('password');
                done();
            });
        });

        it('should add update-password creds and not allow a second one', function (done) {
            var doc = {
                type: 'update-password',
                password: 'password'
            };

            model.addNewCollectionDoc(util.COLLECTION_TYPE.CREDS, 'default', doc, function (err, docs) {
                expect(err).to.not.exist;
                expect(docs[0].password).to.equal('password');

                model.addNewCollectionDoc(util.COLLECTION_TYPE.CREDS, 'default', doc, function (err, docs) {
                    expect(err).to.equal('Error: Can\'t add a second update-password doc');
                    expect(docs).to.not.exist;
                    done();
                });
            });
        });

        it('should store new email', function (done) {
            model.addNewCollectionDoc(util.COLLECTION_TYPE.EMAIL, 'default', {
                fromEmail: 'rock@gmail.com',
                fromFirstName: 'Dwayne',
                subject: 'I am The Rock',
                body: '',
                date: presentTime
            }, function (err, docs) {
                expect(err).to.not.exist;
                expect(docs[0].fromEmail).to.equal('rock@gmail.com');
                expect(docs[0].fromFirstName).to.equal('Dwayne');
                expect(docs[0].subject).to.equal('I am The Rock');
                expect(docs[0].date).to.equal(moment(presentTime).toISOString());
                done();
            });
        });
    });

    describe('#_verifyCollectionParams()', function () {
        it('should pass all checks and succeed', function (done) {
            model._verifyCollectionParams('events', 'default', {
                type: 'appointment',
                subtype: 'medical',
                time: presentTime,
                reminderInfo: mockRemind
            }, function (err, params) {
                expect(err).to.not.exist;

                var asIso = moment(presentTime).toISOString();
                expect(params.time).to.equal(asIso);
                expect(params.reminderInfo.startTime).to.equal(asIso);
                done();
            });
        });

        it('should fail because bad date', function (done) {
            model._verifyCollectionParams('events', 'default', {
                time: 'winning'
            }, function (err, params) {
                expect(err).to.equal(errors.INVALID_DATE);
                expect(params).to.not.exist;
                done();
            });
        });

        it('should fail because keys missing', function (done) {
            model._verifyCollectionParams('events', 'default', {
                type: 'winning'
            }, function (err, params) {
                expect(err).to.equal(errors.KEY_MISSING);
                expect(params).to.not.exist;
                done();
            });
        });

        it('should fail because bad collection', function (done) {
            model._verifyCollectionParams('mouse', 'default', {}, function (err, params) {
                expect(err).to.equal(errors.INVALID_COLLECTION);
                expect(params).to.not.exist;
                done();
            });
        });

        it('should fail because bad docType', function (done) {
            model._verifyCollectionParams('events', 'badbadbad', {}, function (err) {
                expect(err).to.equal(errors.INVALID_DOCTYPE);
                done();
            });
        });
    });

    describe('#_dateCheckAndConvert()', function () {
        it('should pass with correct dates', function (done) {
            var ret = model._dateCheckAndConvert({
                'time': presentTime,
                'dateAdded': presentTime,
                'random': 'value',
                'nested': {
                    'birthday': presentTime,
                    'bird': 'word'
                }
            });

            expect(ret.time).to.equal(moment(presentTime).toISOString());
            expect(ret.dateAdded).to.equal(moment(presentTime).toISOString());
            expect(ret.nested.birthday).to.equal(moment(presentTime).toISOString());
            expect(ret.random).to.equal('value');
            expect(ret.nested.bird).to.equal('word');
            done();
        });

        it('should fail with invalid dates', function (done) {
            var ret = model._dateCheckAndConvert({
                'time': 'invalid'
            });

            expect(ret).to.be.null;
            done();
        });
    });

    describe('#_addToCollection()', function () {
        it('should be able to add single doc', function (done) {
            model._addToCollection('events', {
                hi: 'hi'
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc[0]).to.include.keys('hi');
                done();
            });
        });

        it('should be able to add multiple docs', function (done) {
            model._addToCollection('events', [
                { how: 'are' },
                { you: 'doing' }
            ], function (err, docs) {
                assert.equal(err, null);
                assert.equal(docs.length, 2);
                done();
            });
        });
    });

    describe('#_processCustomMatchingParams()', function () {
        it('should correctly convert params to NeDB logic', function (done) {
            var params = model._processCustomMatchingParams({
                chick: 'fil a',
                _custom: [{
                    key: 'power',
                    op: 'gt',
                    value: 9000
                }, {
                    key: 'life',
                    op: 'lte',
                    value: 42
                }]
            });

            expect(params.chick).to.equal('fil a');
            expect(params._custom).to.not.exist;
            expect(params.$and.length).to.equal(2);
            expect(params.$and[0].power).to.exist;
            expect(params.$and[0].power.$gt).to.equal(9000);
            expect(params.$and[1].life).to.exist;
            expect(params.$and[1].life.$lte).to.equal(42);
            done();
        });
    });

    describe('#_getFromCollection()', function () {
        it('should get single doc from collection', function (done) {
            //  Manually insert a doc to test on
            model._db.events.insert({
                type: 'hype'
            }, function (err, docs) {
                expect(err).to.not.exist;

                model._getFromCollection('events', {
                    type: 'hype'
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(1);
                    done();
                });
            });
        });

        it('should get multiple docs from collection', function (done) {
            //  Manually insert two docs to test on
            model._db.events.insert([{
                type: 'hype'
            }, {
                type: 'hype',
                level: 9000
            }], function (err, docs) {
                expect(err).to.not.exist;

                model._getFromCollection('events', {
                    type: 'hype'
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(2);
                    done();
                });
            });
        });
    });

    describe('#_removeFromCollection()', function () {
        it('should remove multiple matching docs', function (done) {
            //  Manually insert 2 docs then remove
            model._db.events.insert([{
                type: 'hype'
            }, {
                type: 'hype',
                level: 9000
            }], function (err, docs) {
                expect(err).to.not.exist;

                model._removeFromCollection('events', {
                    type: 'hype'
                }, {
                    multi: true
                }, function (err, numRemoved) {
                    expect(err).to.not.exist;
                    expect(numRemoved).to.equal(2);
                    done();
                });
            });
        });
    });

    describe('#_updateInCollection()', function () {
        it('should be able to replace with doc', function (done) {
            //  Manually insert doc to update
            model._db.events.insert({
                type: 'hype'
            }, function (err, docs) {
                expect(err).to.not.exist;

                model._updateInCollection('events', {
                    type: 'hype'
                }, {
                    totally: 'radically',
                    different: 'doc'
                }, {
                    multi: true,
                    returnUpdatedDocs: true
                }, function (err, numAffected, affectedDocs) {
                    expect(err).to.not.exist;
                    expect(numAffected).to.equal(1);
                    expect(affectedDocs[0].totally).to.equal('radically');
                    expect(affectedDocs[0].different).to.equal('doc');
                    expect(affectedDocs[0].type).to.not.exist;
                    done();
                });
            });
        });

        it('should make specific update operations', function (done) {
            //  Manually insert doc to update
            model._db.events.insert({
                type: 'hype',
                level: 8999,
                wat: 'wat'
            }, function (err, docs) {
                expect(err).to.not.exist;

                model._updateInCollection('events', {
                    type: 'hype'
                }, {
                    $set: {
                        type: 'super hype'
                    },
                    $inc: {
                        level: 1
                    },
                    $unset: {
                        wat: 'wat'
                    }
                }, {
                    multi: true,
                    returnUpdatedDocs: true
                }, function (err, numAffected, affectedDocs) {
                    expect(err).to.not.exist;
                    expect(numAffected).to.equal(1);
                    expect(affectedDocs[0].type).to.equal('super hype');
                    expect(affectedDocs[0].level).to.equal(9000);
                    expect(affectedDocs[0].wat).to.not.exist;
                    done();
                });
            });
        });
    });

    describe('#_clearCollection()', function () {
        it('should delete everything in collection', function (done) {
            //  Manually insert a bunch of different docs
            model._db.events.insert([{
                cup: 'chocolate',
                fizz: 10
            }, {
                tea: {
                    type: 'bag',
                    caffeine: 'buzz buzz'
                },
                flowers: ['phone', 'mouse', 42]
            }, {
                lonely: 'object'
            }], function (err, docs) {
                expect(err).to.not.exist;

                model._clearCollection('events', function (err, numRemoved) {
                    expect(err).to.not.exist;
                    expect(numRemoved).to.equal(3);
                    done();
                });
            });
        });
    });
});
