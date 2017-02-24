/* global describe, it, before, beforeEach, after, afterEach */

'use strict';

var assert = require('assert');
var Datastore = require('nedb');
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var Model = require('../src/model');
var Metrics = require('../src/metrics');
var Errors = require('../src/errors');
var expect = require('chai').expect;
var util = require('../src/util');

describe('Metrics', function () {
    var metrics = new Metrics();
    var tempFiles = {
        'commandReport': './db/test-commandReport.db',
        'dailyReport': './db/test-dailyReport.db'
    };

    before(function (done) {
        //  Use temporary db files for testing
        var functions = [];
        Object.keys(tempFiles).forEach(key => {
            metrics._db[key] = new Datastore(tempFiles[key]);
            functions.push(function (cb) {
                metrics._db[key].loadDatabase();
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
                metrics._db[key].remove({}, { multi: true }, cb);
            });
        });
        async.parallel(functions, function (err, results) {
            assert.equal(err, null);
            done();
        });
    });


    describe('#addToCommandReport()', function () {

     var addToCommandReportFunc = function (data, cb) {
       metrics.addToCommandReport (data, function (err, doc) {
           cb(err);
       });
    };

        it('should add 3 individual use instances under 1 report', function (done) {
            //  Test addToCommandReport and get commandReports function

            var funcs = [

                addToCommandReportFunc.bind(null, {
                    command: 'getPersonInfo',
                    totalUsage: 1,
                    individualData: [{
                      	date: moment().toISOString(),
                        input: {
                        first: 'Manuel',
                        last: 'Escalante',
                        get: 'email'
                      },
		                    output: 1
                      }]
                }),
                addToCommandReportFunc.bind(null, {
                    command: 'getPersonInfo',
                    totalUsage: 1,
                    individualData: [{
                      	date: moment().toISOString(),
                        input: {
                        first: 'Juju',
                        last: 'Smith',
                        get: 'phone'
                      },
		                    output: 1
                      }]
                }),
                addToCommandReportFunc.bind(null, {
                    command: 'getPersonInfo',
                    totalUsage: 1,
                    individualData: [{
                        date: moment().toISOString(),
                        input: {
                        first: 'Adoree',
                        last: 'Jackson',
                        get: 'All'
                      },
                        output: 1
                      }]
                })
            ];

            //  Run inserts in synchronous
            async.waterfall(funcs, function (err, cb) {
                assert.equal(err, null);
                //Get all command Reports
                metrics.getcommandReport({
                                  }, function (err, docs) {
                    assert.equal(err, null);
                    assert.equal(docs[0].individualData.length, 3);
                    done();
                });
            });


        });

        it('should add 3 individual use instances under separate reports', function (done) {
            //  Test addToCommandReport and get commandReports function

            var funcs = [

                addToCommandReportFunc.bind(null, {
                    command: 'getPersonInfo',
                    totalUsage: 1,
                    individualData: [{
                        date: moment().toISOString(),
                        input: {
                        first: 'Manuel',
                        last: 'Escalante',
                        get: 'email'
                      },
                        output: 1
                      }]
                }),
                addToCommandReportFunc.bind(null, {
                    command: 'getMedia',
                    totalUsage: 1,
                    individualData: [{
                        date: moment().toISOString(),
                        input: {
                        album: '2017 Pictures'
                      },
                        output: 1
                      }]
                }),
                addToCommandReportFunc.bind(null, {
                    command: 'sendMessage',
                    totalUsage: 1,
                    individualData: [{
                        date: moment().toISOString(),
                        input: {
                        emailTo: 'tommyt@usc.edu',
                        message: 'Hi, How are you doing today?',
                      },
                        output: 1
                      }]
                })
            ];

            //  Run inserts in synchronous
            async.waterfall(funcs, function (err, cb) {
                assert.equal(err, null);
                //Get all command Reports
                metrics.getcommandReport({
                                  }, function (err, docs) {
                    assert.equal(err, null);
                    assert.equal(docs.length, 3);
                    done();
                });
            });


        });

    });


    describe('#addToDailyReport()', function () {

     var addToDailyReportFunc = function (data, cb) {
       metrics.addToDailyReport (data, function (err, doc) {
           cb(err);
       });
    };

    var addWalkToDailyReportFunc = function (data, cb) {
      metrics.addWalkToDailyReport (data, function (err, doc) {
          cb(err);
      });
   };

        it('should add a command 3 times to one day', function (done) {
            //  Test addToDailyReport and get dailyReports function

            var funcs = [
              addToDailyReportFunc.bind(null, {
                  command: 'getPersonInfo',
                  date: moment().startOf('day').toISOString(),
                  time: moment().add(1, 'h').toISOString()

              }),
              addToDailyReportFunc.bind(null, {
                  command: 'orderFood',
                  date: moment().startOf('day').toISOString(),
                  time: moment().add(2, 'h').toISOString()

              }),
              addToDailyReportFunc.bind(null, {
                  command: 'getEntertainment',
                  date: moment().startOf('day').toISOString(),
                  time: moment().add(4, 'h').toISOString()

              })
            ];

            //  Run inserts in synchronous
            async.waterfall(funcs, function (err, cb) {
                assert.equal(err, null);
                //Get single day Report
                metrics.getDailyReport({
                  date: moment().startOf('day').toISOString()
                                  }, function (err, docs) {
                    assert.equal(err, null);
                    assert.equal(docs[0].interactions.length, 3);
                    done();
                });
            });


        });

        it('should add 4 commands 3 over 3 days', function (done) {
            //  Test addToDailyReport and get dailyReports function

            var funcs = [
              addToDailyReportFunc.bind(null, {
                  command: 'getPersonInfo',
                  date: moment().startOf('day').add(1, 'd').toISOString(),
                  time: moment().add(1, 'h').toISOString()

              }),
              addToDailyReportFunc.bind(null, {
                  command: 'orderFood',
                  date: moment().startOf('day').add(2, 'd').toISOString(),
                  time: moment().add(2, 'h').toISOString()

              }),
              addToDailyReportFunc.bind(null, {
                  command: 'getEntertainment',
                  date: moment().startOf('day').toISOString(),
                  time: moment().add(4, 'h').toISOString()

              }),
              addToDailyReportFunc.bind(null, {
                  command: 'getPersonInfo',
                  date: moment().startOf('day').toISOString(),
                  time: moment().add(2, 'h').toISOString()

              })
            ];

            //  Run inserts in synchronous
            async.waterfall(funcs, function (err, cb) {
                assert.equal(err, null);
                //Get all daily Reports
                metrics.getDailyReport({
                                  }, function (err, docs) {
                    assert.equal(err, null);
                    //console.log(JSON.stringify(docs, null, 2));
                    assert.equal(docs.length, 3);
                    done();
                });
            });


        });

        it('should add 3 walkbys for one day', function (done) {
            //  Test addToDailyReport and get dailyReports function

            var funcs = [
              addWalkToDailyReportFunc.bind(null, {
                  date: moment().startOf('day').toISOString()
              }),
              addWalkToDailyReportFunc.bind(null, {
                  date: moment().startOf('day').toISOString()
              }),
              addWalkToDailyReportFunc.bind(null, {
                  date: moment().startOf('day').toISOString()
              })
            ];

            //  Run inserts in synchronous
            async.waterfall(funcs, function (err, cb) {
                assert.equal(err, null);
                //Get all daily Reports
                metrics.getDailyReport({
                                  }, function (err, docs) {
                    assert.equal(err, null);
                    console.log(JSON.stringify(docs, null, 2));
                    assert.equal(docs[0].walkBys, 3);
                    done();
                });
            });


        });

    });


});
