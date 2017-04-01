/* global describe, it, before, beforeEach, after, afterEach */

'use strict';


var proxyquire = require('proxyquire');
var Controller = proxyquire('../../src/core/controller', {
    './email-client': class EmailClient {} //  Fake client so it doesn't try to connect online
});

var fs = require('fs');
var async = require('async');
var moment = require('moment');
var Model = require('../../src/model');
var Errors = require('../../src/errors');
var expect = require('chai').expect;
var util = require('../../src/util');
var Metrics = require('../../src/metrics').Metrics;
var eventBus = require('../../src/core/event/event-bus');
var eventObj = require('../../src/core/event/event');


describe('Metrics Test:', function() {
    var event_Bus;
    var controller;
    before(function() {
        event_Bus = new eventBus();
        controller = new Controller(event_Bus);
    });
    describe('UNKNOWN_USER_INPUT', function() {
        it('should pass input data to the metrics data', function(done) {
            var params = {
                input: 'Please get me directions',
                date: moment().startOf('d').format('x'),
                _cb: function(err, docs) {
                    expect(err).to.not.exist;
                    expect(docs[0].input).to.equal('Please get me directions');
                    expect(docs[0].date).to.equal(moment().startOf('d').format('x'));
                    done();
                }
            }
            event_Bus.emitEvent(eventObj.UNKNOWN_USER_INPUT, params);
        });
    })

    describe('COMMAND_REPORT_ADD', function() {
        it('should pass arguments command report function with correct data', function(done) {
            var params = {
                command: 'getPersonInfo',
                inputParams: {
                    first: 'Manuel',
                    last: 'Escalante',
                    get: 'email'
                },
                _cb: function(err, data) {
                    expect(err).to.not.exist;
                    expect(data[0].command).to.equal('getPersonInfo');
                    done();
                }
            }
            event_Bus.emitEvent(eventObj.COMMAND_REPORT_ADD, params);
        })

    })

    describe('DAILY_REPORT_ADD', function() {

        it('should pass arguments to the daily report function with correct data', function(done) {
            var params = {
                command: 'sendEmail',
                inputParams: {
                    first: 'Manuel',
                    last: 'Escalante',
                    get: 'email'
                },
                _cb: function(err, data) {
                    expect(err).to.not.exist;
                    expect(data[0].individualData[0].command).to.equal('sendEmail');
                    done();
                }
            }
            event_Bus.emitEvent(eventObj.DAILY_REPORT_ADD, params);
        })
    })
})
