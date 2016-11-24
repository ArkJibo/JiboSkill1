/* global describe, it, before, beforeEach, after, afterEach */

'use strict';

var assert = require('assert');
var Datastore = require('nedb');
var fs = require('fs');
var async = require('async');
var Model = require('../../src/model');
var Errors = require('../../src/errors');
var expect = require('chai').expect;

describe('Model', function () {
    var model = new Model();
    var tempFiles = {
        'appointment': './db/test-appointment.db',
        'bill': './db/test-bill.db',
        'entertainment': './db/test-entertainment.db',
        'exercise': './db/test-exercise.db',
        'media': './db/test-media.db',
        'medication': './db/test-medication.db',
        'patient': './db/test-patient.db',
        'people': './db/test-people.db',
        'reminderQueue': './db/test-reminderQueue.db',
        'shopping': './db/test-shopping.db',
        'stock': './db/test-stock.db',
        'voice': './db/test-voice.db'
    };

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
        //  Delete the temp db files
        Object.keys(tempFiles).forEach(key => {
            fs.unlink(tempFiles[key], err => {
                assert.equal(err, null);
            });
        });
    });

    afterEach(function (done) {
        //  Clear contents of each temp db file
        var functions = [];
        Object.keys(tempFiles).forEach(key => {
            functions.push(function (cb) {
                model._db[key].remove({}, { multi: true }, cb);
            });
        });
        async.parallel(functions, function (err, results) {
            assert.equal(err, null);
            done();
        });
    });

    var mockRepeat = {
        type: 'winning',
        startTime: 'fake time',
        interval: '10w'
    };
    var mockRemind = {
        type: 'much winning',
        numReminders: 1337,
        interval: '3y',
        startTime: 'fake time'
    };

    describe('#addAppointment()', function () {
        it('should add appointment', function (done) {
            model.addAppointment({
                type: 'dentist',
                people: ['Eddie Redmayne', 'Sarah Zhou'],
                time: 'fake time',
                repeatInfo: mockRepeat,
                reminderInfo: mockRemind
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('type', 'people', 'time', 'repeatInfo', 'reminderInfo');
                done();
            });
        });

        it('should fail to add appointment', function (done) {
            model.addAppointment({
                garbage: 'garbage'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });
    });

    describe('#addMedication()', function () {
        it('should add medication', function (done) {
            model.addMedication({
                name: 'Donald Trump',
                type: 'makeyougreatagain',
                lastTaken: 'fake date',
                repeatInfo: mockRepeat,
                reminderInfo: mockRemind
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('name', 'type', 'lastTaken', 'repeatInfo', 'reminderInfo');
                done();
            });
        });

        it('should fail to add medication', function (done) {
            model.addMedication({
                garbage: 'garbage'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });
    });

    describe('#addShopping', function () {
        it('should add shopping list', function (done) {
            model.addShopping({
                toPurchase: ['things', 'more things'],
                repeatInfo: mockRepeat,
                reminderInfo: mockRemind
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('toPurchase', 'repeatInfo', 'reminderInfo');
                done();
            });
        });

        it('should add shopping record', function (done) {
            model.addShopping({
                date: 'fake time',
                itemsBought: [{
                    name: 'eraser',
                    amount: 12
                }, {
                    name: 'scissors',
                    amount: 3
                }]
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('date', 'itemsBought');
                done();
            });
        });

        it('should fail because bad list', function (done) {
            model.addShopping({
                toPurchase: ['things', 'more things'],
                repeatInfo: 'wat'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });

        it('should fail because bad record', function (done) {
            model.addShopping({
                date: 'fake time'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });

        it('should fail because bad itemsBought', function (done) {
            model.addShopping({
                date: 'fake time',
                itemsBought: [{
                    name: 'ketchup',
                    amount: 7
                }, {
                    name: 'eyemask',
                    wat: 'wat'
                }]
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });
    });

    describe('#addToStock()', function () {
        it('should add to Stock collection', function (done) {
            model.addToStock({
                type: 'technology',
                name: 'iphone',
                amount: 20
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('type', 'name', 'amount');
                done();
            });
        });

        it('should fail to add Stock', function (done) {
            model.addToStock({
                random: 'nonsense'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });
    });

    describe('#addBill()', function () {
        it('should add to Bill collection', function (done) {
            model.addBill({
                type: 'electricity',
                amount: '150',
                repeatInfo: mockRepeat,
                reminderInfo: mockRemind
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('type', 'amount', 'repeatInfo', 'reminderInfo');
                done();
            });
        });

        it('should fail to add to Bill', function (done) {
            model.addBill({
                random: 'nonsense'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });
    });

    describe('#queueReminder()', function () {
        it('should add new Reminder to collection', function (done) {
            //  Manually insert an event
            model._db.appointment.insert({
                _id: 'alksdjhfi3j928htger'
            }, function (err, docs) {
                assert.equal(err, null);

                model.queueReminder({
                    type: 'appointment',
                    event: {
                        _id: 'alksdjhfi3j928htger'
                    },
                    time: 'now'
                }, function (err, doc) {
                    assert.equal(err, null);
                    expect(doc).to.include.keys('type', 'event', 'time');
                    done();
                });
            });
        });

        it('should fail for missing key', function (done) {
            model.queueReminder({
                why: 'tho'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });

        it('should fail for bad _id', function (done) {
            //  Manually insert an event
            model._db.appointment.insert({
                _id: 'alksdjhfi3j928htger'
            }, function (err, docs) {
                assert.equal(err, null);

                model.queueReminder({
                    type: 'appointment',
                    event: {
                        _id: 'such a terrible id'
                    },
                    time: 'now'
                }, function (err, doc) {
                    assert.equal(err, Errors.BAD_DOC_ID);
                    assert.equal(doc, null);
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
                assert.equal(err, null);
                expect(doc).to.include.keys('type', 'subType', 'value');
                done();
            });
        });

        it('should fail to add info', function (done) {
            model.addPatientInfo({
                random: 'nonsense'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
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
                birthday: 'every day'
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('first', 'last', 'relationship', 'closeness', 'birthday');
                done();
            });
        });

        it('should fail to add person', function (done) {
            model.addPerson({
                utter: 'nonsense'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
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
                assert.equal(err, null);
                expect(doc).to.include.keys('type', 'occasion', 'file', 'timesViewed');
                done();
            });
        });

        it('should fail to add media', function (done) {
            model.addMedia({
                utter: 'nonsense'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });
    });

    describe('#addEntertainment()', function () {
        it('should add new entertainment', function (done) {
            model.addEntertainment({
                type: 'riddle',
                dateAdded: 'blah',
                lastUsed: 'yesterblah',
                rating: 2
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('type', 'dateAdded', 'lastUsed', 'rating');
                done();
            });
        });

        it('should fail to add entertainment', function (done) {
            model.addEntertainment({
                not: 'entertaining'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });
    });

    describe('#addVoiceLine()', function () {
        it('should add new voice line', function (done) {
            model.addVoiceLine({
                type: 'greeting',
                line: 'Greetings adventurer!',
                dateAdded: 'yesteryear'
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('type', 'line', 'dateAdded');
                done();
            });
        });

        it('should fail to add voice', function (done) {
            model.addVoiceLine({
                bad: 'voice'
            }, function (err, doc) {
                assert.equal(err, Errors.KEY_MISSING);
                assert.equal(doc, null);
                done();
            });
        });
    });

    describe('#_verifyCollectionParams()', function () {
        it('should fail because bad collection', function (done) {
            assert.equal(model._verifyCollectionParams('mouse', {}, true), false);
            done();
        });
    });

    describe('#_checkForKeys()', function () {
        it('should be successful match', function (done) {
            assert.equal(model._checkForKeys({
                a: 'a',
                b: 'b',
                c: 'c'
            }, ['a', 'b', 'c']), true);
            done();
        });

        it('should be unsuccessful match', function (done) {
            assert.equal(model._checkForKeys({
                a: 'a',
                b: 'b',
                c: 'c'
            }, ['b', 'c', 'd']), false);
            done();
        });
    });

    describe('#_addToCollection()', function () {
        it('should be able to add single doc', function (done) {
            model._addToCollection('appointment', {
                hi: 'hi'
            }, function (err, doc) {
                assert.equal(err, null);
                expect(doc).to.include.keys('hi');
                done();
            });
        });

        it('should be able to add multiple docs', function (done) {
            model._addToCollection('appointment', [
                { how: 'are' },
                { you: 'doing' }
            ], function (err, docs) {
                assert.equal(err, null);
                assert.equal(docs.length, 2);
                done();
            });
        });
    });

    describe('#_getFromCollection()', function () {
        it('should get single doc from collection', function (done) {
            //  Manually insert a doc to test on
            model._db.appointment.insert({
                type: 'hype'
            }, function (err, docs) {
                assert.equal(err, null);

                model._getFromCollection('appointment', {
                    type: 'hype'
                }, function (err, docs) {
                    assert.equal(err, null);
                    assert.equal(docs.length, 1);
                    done();
                });
            });
        });

        it('should get multiple docs from collection', function (done) {
            //  Manually insert two docs to test on
            model._db.appointment.insert([{
                type: 'hype'
            }, {
                type: 'hype',
                level: 9000
            }], function (err, docs) {
                assert.equal(err, null);

                model._getFromCollection('appointment', {
                    type: 'hype'
                }, function (err, docs) {
                    assert.equal(err, null);
                    assert.equal(docs.length, 2);
                    done();
                });
            });
        });
    });

    describe('#_removeFromCollection()', function () {
        it('should remove multiple matching docs', function (done) {
            //  Manually insert 2 docs then remove
            model._db.appointment.insert([{
                type: 'hype'
            }, {
                type: 'hype',
                level: 9000
            }], function (err, docs) {
                assert.equal(err, null);

                model._removeFromCollection('appointment', {
                    type: 'hype'
                }, function (err, numRemoved) {
                    assert.equal(err, null);
                    assert.equal(numRemoved, 2);
                    done();
                });
            });
        });
    });

    describe('#_updateInCollection()', function () {
        it('should be able to replace with doc', function (done) {
            //  Manually insert doc to update
            model._db.appointment.insert({
                type: 'hype'
            }, function (err, docs) {
                assert.equal(err, null);

                model._updateInCollection('appointment', {
                    type: 'hype'
                }, {
                    totally: 'radically',
                    different: 'doc'
                }, function (err, numAffected, affectedDocs) {
                    assert.equal(err, null);
                    assert.equal(numAffected, 1);
                    assert.equal(affectedDocs[0].totally, 'radically');
                    assert.equal(affectedDocs[0].different, 'doc');
                    assert.equal(affectedDocs[0].type, null);
                    done();
                });
            });
        });

        it('should make specific update operations', function (done) {
            //  Manually insert doc to update
            model._db.appointment.insert({
                type: 'hype',
                level: 8999,
                wat: 'wat'
            }, function (err, docs) {
                assert.equal(err, null);

                model._updateInCollection('appointment', {
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
                }, function (err, numAffected, affectedDocs) {
                    assert.equal(err, null);
                    assert.equal(numAffected, 1);
                    assert.equal(affectedDocs[0].type, 'super hype');
                    assert.equal(affectedDocs[0].level, 9000);
                    assert.equal(affectedDocs[0].wat, null);
                    done();
                });
            });
        });
    });

    describe('#_clearCollection()', function () {
        it('should delete everything in collection', function (done) {
            //  Manually insert a bunch of different docs
            model._db.appointment.insert([{
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
                assert.equal(err, null);

                model._clearCollection('appointment', function (err, numRemoved) {
                    assert.equal(err, null);
                    assert.equal(numRemoved, 3);
                    done();
                });
            });
        });
    });
});
