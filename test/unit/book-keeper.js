/* global describe, it, before, beforeEach, after, afterEach */

'use strict';


var proxyquire = require('proxyquire');
var Controller = proxyquire('../../src/core/controller', {
    './email-client': class EmailClient {}  //  Fake client so it doesn't try to connect online
});

var fs = require('fs');
var async = require('async');
var moment = require('moment');
var Model = require('../../src/model');
var Errors = require('../../src/errors');
var expect = require('chai').expect;
var util = require('../../src/util');
var Bookkeeper = require('../../src/core/book-keeper').Bookkeeper;
var eventBus = require('../../src/core/event/event-bus');
var assert = require('assert');
var eventObj = require('../../src/core/event/event');

var testEvents = require('../test-events');

var chai = require('chai');
var should = chai.should();


describe('CLEAR_PAST_RECORDS', function() {
  var event_Bus;
  var controller;
    before(function() {
          event_Bus = new eventBus();
          controller = new Controller(event_Bus);
    });

    afterEach(function (done) {
        //  Clear contents of each temp db file
        controller._model._clearDatabase(function (err, results) {
            expect(err).to.not.exist;
            done();
        });
        testEvents = require('../test-events');
    });

      beforeEach(function (done) {
          //  Add the calendar events
          var funcs = [];
          testEvents.forEach(function (evt) {
              funcs.push(function (cb) {
                  event_Bus.emitEvent(eventObj.DATABASE_ADD, {
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

        it('should remove 1 event that is fits the type and time', function(done) {
            var params = {
                type: 'social',
                time: 5
            };
            params._cb = function(err, numRemoved) {
                assert.equal(err, null);
                expect(numRemoved).to.equal(1);
                done();
            };
            event_Bus.emitEvent(eventObj['CLEAR_PAST_RECORDS'], params);
        })


})
