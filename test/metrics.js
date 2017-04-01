/* global describe, it, before, beforeEach, after, afterEach */

'use strict';

var assert = require('assert');
var moment = require('moment');
var Model = require('../src/model');

var Errors = require('../src/errors');
var expect = require('chai').expect;
var util = require('../src/util');



var EventEmitter = require('events').EventEmitter;
var chai = require('chai');
var should = chai.should();

var EventBus = require('../src/core/event/event-bus.js').EventEmitter;

var Metrics = require('../src/metrics');
Metrics.init(EventBus);

//var metricsEventEmitter = new EventBus;
//var metricsEventEmitter = new EventEmitter;

var sinon = require('sinon');

describe('UNKNOWN_USER_INPUT', function(){

  describe('#emit()', function(){

    it('should pass arguments to the callback function with correct data', function(done){
      EventBus.emit('UNKNOWN_USER_INPUT',
        {   input: "Please get me directions",
	           date: moment().startOf('d').toISOString()
          }, function(err, data){
                if(data){
                  assert.equal(err, null);
                  data.input.should.equal("Please get me directions");
                  data.date.should.equal(moment().startOf('d').toISOString());
                  done();
                }
            });
    })


  })
})

describe('COMMAND_REPORT_ADD', function(){

  describe('#emit()', function(){

    it('should pass arguments to the callback function with correct data', function(done){
      EventBus.emit('COMMAND_REPORT_ADD', 'getPersonInfo',
      {       first: 'Manuel',
              last: 'Escalante',
              get: 'email'

      }, function(err, data){
                if(data){
                  assert.equal(err, null);
                  data.input.first.should.equal('Manuel');
                  done();
                }
            });
    })


  })
})

describe('DAILY_REPORT_ADD', function(){

  describe('#emit()', function(){

    it('should pass arguments to the callback function with correct data', function(done){
      EventBus.emit('DAILY_REPORT_ADD', 'emailContact', function(err, data){
                if(data){
                  assert.equal(err, null);
                  data.command.should.equal('emailContact');
                  done();
                }
            });
    })


  })
})
