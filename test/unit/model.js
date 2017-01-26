/* global describe, it, before, beforeEach, after, afterEach */
/*jshint expr: true*/

'use strict';

var assert = require('assert');
var Datastore = require('nedb');
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var Model = require('../../src/model');
var Errors = require('../../src/errors');
var expect = require('chai').expect;
var util = require('../../src/util');
var _ = require('lodash');

describe('Model', function () {
    var model = new Model();
    var tempFiles = {
        'events': './db/test-events.db',
        'reminderQueue': './db/test-reminderQueue.db',
        'inventory': './db/test-inventory.db',
        'patient': './db/test-patient.db',
        'people': './db/test-people.db',
        'media': './db/test-media.db',
        'entertainment': './db/test-entertainment.db',
        'voice': './db/test-voice.db'
    };

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
    var mockRepeat = {
        type: 'winning',
        startTime: presentTime,
        endTime: presentTime,
        interval: '10w'
    };
    var mockRemind = {
        type: 'much winning',
        numReminders: 1337,
        interval: '3y',
        startTime: presentTime
    };

    describe('#getTodaySchedule()', function () {
        before(function (done) {
            //  Insert test set of events
            model._db.events.insert([{
                type: 'fun',
                time: moment(presentTime).toISOString()
            }, {
                type: 'run',
                time: moment(presentTime).add(2, 'hours').toISOString()
            }, {
                type: 'bun',
                time: moment(presentTime).add(8, 'hours').toISOString()
            }, {
                type: 'stun',
                time: moment(presentTime).add(2, 'days').toISOString()
            }, {
                type: 'hun',
                time: moment(presentTime).subtract(1, 'days').toISOString()
            }], function (err, docs) {
                expect(err).to.not.exist;
                done();
            });
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

                model.getNextMatchingEvent(util.JIBO_EVENT_TYPE.APPOINTMENT, {
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

    describe('#getMatchingEvents()', function () {
        it('should return proper matches', function (done) {
            //  Manually insert docs
            model._db.events.insert([{
                type: 'hype',
                level: 25
            }, {
                type: 'hype',
                level: 10
            }, {
                type: 'pipe',
                level: 30
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getMatchingEvents({
                    type: 'hype',
                    _custom: [{
                        key: 'level',
                        op: 'gt',
                        value: 20
                    }]
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(1);
                    expect(docs[0].type).to.equal('hype');
                    expect(docs[0].level).to.equal(25);
                    done();
                });
            });
        });
    });

    describe('#getNextReminder()', function () {
        it('should get correct reminder', function (done) {
            //  Manually insert
            model._db.reminderQueue.insert([{
                name: 'event1',
                time: moment(presentTime).add(1, 'hour').toISOString()
            }, {
                name: 'event2',
                time: moment(presentTime).add(2, 'hour').toISOString()
            }, {
                name: 'event3',
                time: moment(presentTime).add(3, 'hour').toISOString()
            }, {
                name: 'event4',
                time: moment(presentTime).add(4, 'hour').toISOString()
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
                time: moment(presentTime).subtract(2, 'days').toISOString()
            }, {
                name: 'event2',
                time: moment(presentTime).subtract(1, 'days').toISOString()
            }, {
                name: 'event3',
                time: moment(presentTime).add(1, 'days').toISOString()
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getNextReminder(function (err, doc) {
                    expect(err).to.not.exist;
                    expect(doc.name).to.equal('event3');
                    done();
                });
            });
        });

        it('should not break if no reminders', function (done) {
            model.getNextReminder(function (err, doc) {
                assert.equal(err, null);
                assert.equal(doc, undefined);
                done();
            });
        });
    });

    describe('#getMatchingInventory()', function () {
        it('should get correct item', function (done) {
            model._db.inventory.insert([{
                type: 'box',
                amount: 10
            }, {
                type: 'big box',
                amount: 4
            }, {
                type: 'mini box',
                amount: 7
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getMatchingInventory({
                    _custom: [{
                        key: 'amount',
                        op: 'lte',
                        value: 4
                    }]
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(1);
                    expect(docs[0].type).to.equal('big box');
                    expect(docs[0].amount).to.equal(4);
                    done();
                });
            });
        });
    });

    describe('#getMatchingPatientInfo()', function () {
        it('should get docs matching the params', function (done) {
            //  Manually insert docs
            model._db.patient.insert([{
                type: 'health',
                subType: 'weight'
            }, {
                type: 'health',
                subType: 'blood pressure'
            }], function (err, docs) {
                assert.equal(err, null);

                model.getMatchingPatientInfo({
                    type: 'health'
                }, function (err, docs) {
                    assert.equal(err, null);
                    assert.equal(docs.length, 2);
                    done();
                });
            });
        });

        it('should get no docs matching the params', function (done) {
            //  Manually insert docs
            model._db.patient.insert([{
                type: 'health'
            }, {
                random: 'health'
            }], function (err, docs) {
                assert.equal(err, null);

                model.getMatchingPatientInfo({
                    random: 'param'
                }, function (err, docs) {
                    assert.equal(err, null);
                    assert.equal(docs.length, 0);
                    done();
                });
            });
        });
    });

    describe('#getMatchingPersonInfo()', function () {
        it('should get person without custom params', function (done) {
            //  Manually insert docs
            model._db.people.insert([{
                first: 'Eric',
                last: 'Dong'
            }, {
                first: 'Dave',
                last: 'Barnhart'
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getMatchingPersonInfo({
                    first: 'Eric'
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(1);
                    done();
                });
            });
        });

        it('should get person with custom params', function (done) {
            //  Manually insert docs
            model._db.people.insert([{
                first: 'Eric',
                closeness: 4
            }, {
                first: 'Eric',
                closeness: 8
            }, {
                first: 'Dave',
                closeness: 10
            }, {
                first: 'Dave',
                closeness: 2
            }], function (err, docs) {
                expect(err).to.not.exist;

                var funcs = [
                    function (cb) {
                        model.getMatchingPersonInfo({
                            first: 'Eric',
                            _custom: [{
                                key: 'closeness',
                                op: 'gte',
                                value: 5
                            }]
                        }, function (err, docs) {
                            expect(err).to.not.exist;
                            expect(docs.length).to.equal(1);
                            cb();
                        });
                    },
                    function (cb) {
                        model.getMatchingPersonInfo({
                            _custom: [{
                                key: 'closeness',
                                op: 'lte',
                                value: 8
                            }]
                        }, function (err, docs) {
                            expect(err).to.not.exist;
                            expect(docs.length).to.equal(3);
                            cb();
                        });
                    }
                ];

                async.parallel(funcs, function () {
                    done();
                });
            });
        });
    });

    describe('#getMatchingMedia()', function () {
        it('should get media without custom params', function (done) {
            //  Manually insert
            model._db.media.insert([{
                type: 'photo',
                name: 'bottle'
            }, {
                type: 'photo',
                name: 'lamp'
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getMatchingMedia({
                    type: 'photo'
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(2);
                    done();
                });
            });
        });

        it('should get media with viewed custom params', function (done) {
            //  Manually insert
            model._db.media.insert([{
                type: 'photo1',
                timesViewed: 1
            }, {
                type: 'photo2',
                timesViewed: 2
            }, {
                type: 'photo3',
                timesViewed: 3
            }, {
                type: 'photo4',
                timesViewed: 4
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getMatchingMedia({
                    _custom: [{
                        key: 'timesViewed',
                        op: 'gte',
                        value: 2
                    }]
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(3);

                    model.getMatchingMedia({
                        _custom: [{
                            key: 'timesViewed',
                            op: 'gte',
                            value: 2
                        }, {
                            key: 'timesViewed',
                            op: 'lte',
                            value: 3
                        }]
                    }, function (err, docs) {
                        expect(err).to.not.exist;
                        expect(docs.length).to.equal(2);
                        done();
                    });
                });
            });
        });

        it('should get media with timeTaken custom params', function (done) {
            //  Manually insert
            model._db.media.insert([{
                type: 'photo1',
                timeTaken: moment(presentTime).add(1, 'days').toISOString()
            }, {
                type: 'photo2',
                timeTaken: moment(presentTime).add(2, 'days').toISOString()
            }, {
                type: 'photo3',
                timeTaken: moment(presentTime).add(3, 'days').toISOString()
            }, {
                type: 'photo4',
                timeTaken: moment(presentTime).add(4, 'days').toISOString()
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getMatchingMedia({
                    _custom: [{
                        key: 'timeTaken',
                        op: 'lte',
                        value: moment(presentTime).add(3, 'days').toISOString()
                    }]
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(3);

                    model.getMatchingMedia({
                        _custom: [{
                            key: 'timeTaken',
                            op: 'lte',
                            value: moment(presentTime).add(4, 'days').toISOString()
                        }, {
                            key: 'timeTaken',
                            op: 'gt',
                            value: moment(presentTime).add(2, 'days').toISOString()
                        }]
                    }, function (err, docs) {
                        expect(err).to.not.exist;
                        expect(docs.length).to.equal(2);
                        done();
                    });
                });
            });
        });
    });

    describe('#getMatchingEntertainment()', function () {
        beforeEach(function (done) {
            //  Push in some entertainment docs
            var entertain = function (params, cb) {
                model._db.entertainment.insert(params, function (err, docs) {
                    cb(err);
                });
            };

            var funcs = [];
            var extra = ['typeA', 'typeB'];
            for (var i = 0; i < 10; i++) {
                funcs.push(entertain.bind(null, {
                    extra: extra[Math.floor(i / 5)],
                    rating: i,
                    lastUsed: moment(presentTime).subtract(i, 'days').toISOString()
                }));
            }

            async.parallel(funcs, function (err) {
                expect(err).to.not.exist;
                done();
            });
        });


        it('should get entertainment with no custom params', function (done) {
            model.getMatchingEntertainment({
                extra: 'typeA'
            }, function (err, doc, numDocs) {
                expect(err).to.not.exist;
                expect(doc.extra).to.equal('typeA');
                expect(numDocs).to.equal(5);
                done();
            });
        });

        it('should get entertainment with rating custom params', function (done) {
            model.getMatchingEntertainment({
                extra: 'typeB',
                _custom: [{
                    key: 'rating',
                    op: 'gte',
                    value: 6
                }]
            }, function (err, doc, numDocs) {
                expect(err).to.not.exist;
                expect(doc.extra).to.equal('typeB');
                expect(doc.rating).to.be.at.least(6);
                expect(numDocs).to.equal(4);

                model.getMatchingEntertainment({
                    extra: 'typeB',
                    _custom: [{
                        key: 'rating',
                        op: 'gte',
                        value: 6
                    }, {
                        key: 'rating',
                        op: 'lte',
                        value: 8
                    }]
                }, function (err, doc, numDocs) {
                    expect(err).to.not.exist;
                    expect(doc.extra).to.equal('typeB');
                    expect(doc.rating).to.be.at.least(6).and.at.most(8);
                    expect(numDocs).to.equal(3);
                    done();
                });
            });
        });

        it('should get entertainment with lastUsed custom params', function (done) {
            model.getMatchingEntertainment({
                extra: 'typeA',
                _custom: [{
                    key: 'lastUsed',
                    op: 'lte',
                    value: moment(presentTime).subtract(3, 'days').toISOString()
                }]
            }, function (err, doc, numDocs) {
                expect(err).to.not.exist;
                expect(doc.extra).to.equal('typeA');
                expect(numDocs).to.equal(2);

                model.getMatchingEntertainment({
                    extra: 'typeB',
                    _custom: [{
                        key: 'lastUsed',
                        op: 'lte',
                        value: moment(presentTime).subtract(6, 'days').toISOString()
                    }, {
                        key: 'lastUsed',
                        op: 'gte',
                        value: moment(presentTime).subtract(8, 'days').toISOString()
                    }]
                }, function (err, doc, numDocs) {
                    expect(err).to.not.exist;
                    expect(doc.extra).to.equal('typeB');
                    expect(numDocs).to.equal(3);
                    done();
                });
            });
        });

        it('should get entertainment with both lastUsed and rating', function (done) {
            model.getMatchingEntertainment({
                _custom: [{
                    key: 'lastUsed',
                    op: 'lte',
                    value: moment(presentTime).subtract(4, 'days').toISOString()
                }, {
                    key: 'rating',
                    op: 'gte',
                    value: 7
                }]
            }, function (err, doc, numDocs) {
                expect(err).to.not.exist;
                expect(numDocs).to.equal(3);
                done();
            });
        });
    });

    describe('#getMatchingVoice()', function () {
        it('should get correct voice', function (done) {
            //  Manually insert
            model._db.voice.insert([{
                type: 'greeting',
                line: 'hihihihihi'
            }, {
                type: 'goodbye',
                line: 'byebyebyebyebye'
            }], function (err, docs) {
                expect(err).to.not.exist;

                model.getMatchingVoice({
                    type: 'greeting'
                }, function (err, docs) {
                    expect(err).to.not.exist;
                    expect(docs.length).to.equal(1);
                    expect(docs[0].line).to.equal('hihihihihi');
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
            model.updateCollection(util.JIBO_COLLECTION_TYPE.EVENTS, {
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
            model.updateCollection(util.JIBO_COLLECTION_TYPE.EVENTS, {
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

                model.removeFromCollection(util.JIBO_COLLECTION_TYPE.EVENTS, {
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

                model.removeFromCollection(util.JIBO_COLLECTION_TYPE.EVENTS, {}, function (err, numRemoved) {
                    expect(err).to.not.exist;
                    expect(numRemoved).to.equal(4);
                    done();
                });
            });
        });
    });

    describe('#addNewEvent()', function () {
        it('should succeed with correct params', function (done) {
            model.addNewEvent({
                type: 'appointment',
                subtype: 'medical',
                time: presentTime,
                repeatInfo: mockRepeat,
                reminderInfo: mockRemind
            }, function (err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('verification error should be passed along correctly', function (done) {
            model.addNewEvent({
                random: 'value'
            }, function (err) {
                expect(err).to.equal(Errors.KEY_MISSING);
                done();
            });
        });
    });

    describe('#addNewInventory()', function () {
        var supply = {
            type: 'supply',
            subtype: 'grocery',
            name: 'broccoli',
            amount: 5
        };
        var record = {
            type: 'record',
            date: presentTime,
            purchased: [{
                name: 'broccoli',
                amount: 5
            }]
        };

        it('should succeed with correct params for supply', function (done) {
            model.addNewInventory(supply, function (err, supp) {
                expect(err).to.not.exist;
                expect(supp).to.exist;
                done();
            });
        });

        it('should succeed with correct params for record', function (done) {
            model.addNewInventory(record, function (err, supp) {
                expect(err).to.not.exist;
                expect(supp).to.exist;
                done();
            });
        });

        it('handle incorrect item type', function (done) {
            model.addNewInventory({
                type: 'wat'
            }, function (err, supp) {
                expect(err).to.equal(Errors.INVALID_INVENTORY);
                expect(supp).to.not.exist;
                done();
            });
        });

        it('verification error should be passed along correctly', function (done) {
            model.addNewInventory({
                type: 'record',
                random: 'value'
            }, function (err, supp) {
                expect(err).to.equal(Errors.KEY_MISSING);
                expect(supp).to.not.exist;
                done();
            });
        });
    });

    describe('#addReminder()', function () {
        it('should add new Reminder to collection', function (done) {
            //  Manually insert an event
            model._db.events.insert({
                _id: 'alksdjhfi3j928htger'
            }, function (err, docs) {
                expect(err).to.not.exist;

                model.addReminder({
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

        it('should fail for missing key', function (done) {
            model.addReminder({
                why: 'tho'
            }, function (err, doc) {
                expect(err).to.equal(Errors.KEY_MISSING);
                expect(doc).to.not.exist;
                done();
            });
        });

        it('should fail for bad _id', function (done) {
            //  Manually insert an event
            model._db.events.insert({
                _id: 'alksdjhfi3j928htger'
            }, function (err, docs) {
                expect(err).to.not.exist;

                model.addReminder({
                    type: 'events',
                    event: {
                        _id: 'such a terrible id'
                    },
                    time: presentTime
                }, function (err, doc) {
                    expect(err).to.equal(Errors.BAD_DOC_ID);
                    expect(doc).to.not.exist;
                    done();
                });
            });
        });
    });

    describe('#addPatientInfo()', function () {
        it('should add new info', function (done) {
            model.addPatientInfo({
                type: 'favorite',
                subType: 'game',
                value: 'hopscotch'
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should fail to add info', function (done) {
            model.addPatientInfo({
                random: 'nonsense'
            }, function (err, doc) {
                expect(err).to.equal(Errors.KEY_MISSING);
                expect(doc).to.not.exist;
                done();
            });
        });
    });

    describe('#addPerson()', function () {
        it('should add new person', function (done) {
            model.addPerson({
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

        it('should fail to add person', function (done) {
            model.addPerson({
                utter: 'nonsense'
            }, function (err, doc) {
                expect(err).to.equal(Errors.KEY_MISSING);
                expect(doc).to.not.exist;
                done();
            });
        });
    });

    describe('#addMedia()', function () {
        it('should add new media', function (done) {
            model.addMedia({
                type: 'photo',
                occasion: 'wedding',
                file: 'media/music/banana.mp3',
                timesViewed: 0
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should fail to add media', function (done) {
            model.addMedia({
                utter: 'nonsense'
            }, function (err, doc) {
                expect(err).to.equal(Errors.KEY_MISSING);
                expect(doc).to.not.exist;
                done();
            });
        });
    });

    describe('#addEntertainment()', function () {
        it('should add new entertainment', function (done) {
            model.addEntertainment({
                type: 'riddle',
                dateAdded: presentTime,
                lastUsed: presentTime,
                rating: 2
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should fail to add entertainment', function (done) {
            model.addEntertainment({
                not: 'entertaining'
            }, function (err, doc) {
                expect(err).to.equal(Errors.KEY_MISSING);
                expect(doc).to.not.exist;
                done();
            });
        });
    });

    describe('#addVoiceLine()', function () {
        it('should add new voice line', function (done) {
            model.addVoiceLine({
                type: 'greeting',
                line: 'Greetings adventurer!',
                dateAdded: presentTime
            }, function (err, doc) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should fail to add voice', function (done) {
            model.addVoiceLine({
                bad: 'voice'
            }, function (err, doc) {
                expect(err).to.equal(Errors.KEY_MISSING);
                expect(doc).to.not.exist;
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
                repeatInfo: mockRepeat,
                reminderInfo: mockRemind
            }, function (err, params) {
                expect(err).to.not.exist;

                var asIso = moment(presentTime).toISOString();
                expect(params.time).to.equal(asIso);
                expect(params.repeatInfo.startTime).to.equal(asIso);
                expect(params.repeatInfo.endTime).to.equal(asIso);
                expect(params.reminderInfo.startTime).to.equal(asIso);
                done();
            });
        });

        it('should fail because bad date', function (done) {
            model._verifyCollectionParams('events', 'default', {
                time: 'winning'
            }, function (err, params) {
                expect(err).to.equal(Errors.INVALID_DATE);
                expect(params).to.not.exist;
                done();
            });
        });

        it('should fail because keys missing', function (done) {
            model._verifyCollectionParams('events', 'default', {
                type: 'winning'
            }, function (err, params) {
                expect(err).to.equal(Errors.KEY_MISSING);
                expect(params).to.not.exist;
                done();
            });
        });

        it('should fail because bad collection', function (done) {
            model._verifyCollectionParams('mouse', 'default', {}, function (err, params) {
                expect(err).to.equal(Errors.INVALID_COLLECTION);
                expect(params).to.not.exist;
                done();
            });
        });

        it('should fail because bad docType', function (done) {
            model._verifyCollectionParams('events', 'badbadbad', {}, function (err) {
                expect(err).to.equal(Errors.INVALID_DOCTYPE);
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
                expect(doc).to.include.keys('hi');
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
