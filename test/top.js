/* global describe, it, before, beforeEach, after, afterEach */
/*jshint expr: true*/

'use strict';

var fs = require('fs');
var expect = require('chai').expect;
var path = require('path');
var config = require('config');
var async = require('async');

var cleanup = function (cb) {
    //  Delete the temp db files
    var funcs = [];
    var files = config.get('model.db');
    Object.keys(files).forEach(function (key) {
        funcs.push(function(cb) {
            fs.unlink(files[key], function (err) {
                expect(err).to.not.exist;
                cb();
            });
        });
    });
    async.parallel(funcs, cb);
};

describe('Top level for all tests', function () {
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
    //  For cleaning up on test conclusion
    after(function (done) {
        cleanup(function () {
            done();
        });
    });

    //  Run unit tests
    var unitTests = fs.readdirSync('./test/unit/');
    unitTests.map(function (file) {
        return path.join(__dirname, 'unit', file);
    }).forEach(function (test) {
        describe(path.basename(test).toUpperCase(), function () {
            require(test);
        });
    });

    //  Run functional tests
    var funcTests = fs.readdirSync('./test/func/');
    funcTests.map(function (file) {
        return path.join(__dirname, 'func', file);
    }).forEach(function (test) {
        describe(path.basename(test).toUpperCase(), function () {
            require(test);
        });
    });
});
