'use strict';

var expect = require('chai').expect;
var async = require('async');
var EventBus = require('../../src/core/event/event-bus');
var errors = require('../../src/errors');

describe('EventBus', function () {
    var eventBus;
    before(function () {
        eventBus = new EventBus();
    });

    beforeEach(function (done) {
        eventBus.removeAllListeners();
        done();
    });

    describe('#addEventListener() and addOnceEventListener()', function () {
        it('should work for valid args', function (done) {
            eventBus.addEventListener('test', this, function () {});
            eventBus.addOnceEventListener('test', this, function () {});
            expect(eventBus.listenerCount('test')).to.equal(2);
            done();
        });

        it('both should fail for null args', function (done) {
            var funcs = [
                function (cb) {
                    try {
                        eventBus.addEventListener();
                        cb(null, 'Should hit exception');
                    } catch (e) {
                        cb(null, e);
                    }
                },
                function (cb) {
                    try {
                        eventBus.addOnceEventListener();
                        cb(null, 'Should hit exception');
                    } catch (e) {
                        cb(null, e);
                    }
                }
            ];
            async.parallel(funcs, function (err, results) {
                expect(err).to.not.exist;
                expect(results[0]).to.equal('Null or undefined arguments passed to event bus');
                expect(results[1]).to.equal('Null or undefined arguments passed to event bus');
                done();
            });
        });

        it('both should fail for invalid arg types', function (done) {
            var funcs = [
                function (cb) {
                    try {
                        eventBus.addEventListener(1, 2, 3);
                        cb(null, 'Should hit exception');
                    } catch (e) {
                        cb(null, e);
                    }
                },
                function (cb) {
                    try {
                        eventBus.addOnceEventListener(1, 2, 3);
                        cb(null, 'Should hit exception');
                    } catch (e) {
                        cb(null, e);
                    }
                }
            ];
            async.parallel(funcs, function (err, results) {
                expect(err).to.not.exist;
                expect(results[0]).to.equal('Invalid argument types passed to event bus');
                expect(results[1]).to.equal('Invalid argument types passed to event bus');
                done();
            });
        });
    });

    describe('#removeEventListener', function () {
        it('should work for valid args', function (done) {
            var func = function () {};
            eventBus.on('test', func);
            expect(eventBus.listenerCount('test')).to.equal(1);
            eventBus.removeEventListener('test', func);
            expect(eventBus.listenerCount('test')).to.equal(0);
            done();
        });

        it('should fail for bad args', function (done) {
            var funcs = [
                function (cb) {
                    try {
                        eventBus.removeEventListener();
                        cb(null, 'Should hit exception');
                    } catch (e) {
                        cb(null, e);
                    }
                },
                function (cb) {
                    try {
                        eventBus.removeEventListener(1, 3);
                        cb(null, 'Should hit exception');
                    } catch (e) {
                        cb(null, e);
                    }
                }
            ];
            async.parallel(funcs, function (err, results) {
                expect(err).to.not.exist;
                expect(results[0]).to.equal('Null or undefined arguments passed to event bus');
                expect(results[1]).to.equal('Invalid argument types passed to event bus');
                done();
            });
        });
    });

    describe('#clear', function () {
        it('should work for no event', function (done) {
            var func = function () {};
            eventBus.on('test', func);
            eventBus.on('test1', func);
            eventBus.clear();
            expect(eventBus.listenerCount('test')).to.equal(0);
            expect(eventBus.listenerCount('test1')).to.equal(0);
            done();
        });

        it('should work for specified event', function (done) {
            var func = function () {};
            eventBus.on('test', func);
            eventBus.on('test1', func);
            eventBus.clear('test');
            expect(eventBus.listenerCount('test')).to.equal(0);
            expect(eventBus.listenerCount('test1')).to.equal(1);
            done();
        });

        it('should fail for bad event', function (done) {
            try {
                eventBus.clear(1);
                done('Should hit exception');
            } catch (e) {
                expect(e).to.equal(errors.BAD_EVENT );
                done();
            }
        });
    });

    describe('#emitEvent', function () {
        it('should work for valid args', function (done) {
            var params = {
                test: 'test',
                test1: 'test1'
            };
            var cb = function (params) {
                expect(params).to.exist;
                expect(params.test).to.equal('test');
                expect(params.test1).to.equal('test1');
                done();
            };

            eventBus.on('event', cb);
            eventBus.emitEvent('event', params);
        });
    });

    describe('#_validateArgs', function () {
        it('should return null for valid args', function (done) {
            var ret = eventBus._validateArgs('a', function () {});
            expect(ret).to.be.null;
            done();
        });

        it('should work for null args', function (done) {
            var ret = eventBus._validateArgs(null, null);
            expect(ret).to.equal('Null or undefined arguments passed to event bus');
            done();
        });

        it('should work for bad args', function (done) {
            var ret = eventBus._validateArgs(1, 3);
            expect(ret).to.equal('Invalid argument types passed to event bus');
            done();
        });
    });
});
