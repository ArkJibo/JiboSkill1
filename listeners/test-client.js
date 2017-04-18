'use strict';

var Mocha = require('mocha');
var fs = require('fs');
var path = require('path');
var Q = require('q');

class TestClient {

    constructor () {
        var self = this;
        self._testResult = Q.defer();
        self._testName = Q.defer();
        self.total = 0;
        self.pass = 0;
    }

    resetPromise () {
        var self = this;
        self._testResult = Q.defer();
        self._testName = Q.defer();
    }

    getTestResult () {
        var self = this;
        return self._testResult.promise;
    }

    getTestName () {
        var self = this;
        return self._testName.promise;
    }

    runTest (nlparse) {
        var self = this;
        this.total = 0;
        this.pass = 0;
        var result = [];
        var status = undefined;

        //  Get the variables set by main.rule
        var dir = '';
        switch (nlparse.type) {
            case 'unit':
                dir = './test/unit/';
                break;

            case 'functional':
                dir = './test/func/';
                break;
            default:
                status = {
                    'status': false,
                    'msg': 'Can\'t run unknown tests!'
                };
                self._testName.resolve(status);
                return;
        }

        var alertMsg = ('Running ' + nlparse.type + ' tests in directory ' + dir);
        status = {
            'status': true,
            'msg': alertMsg
        };
        self._testName.resolve(status);

        //  Add all the tests in the folder to mocha
        var mocha = new Mocha({
            timeout: 10000
        });
        fs.readdirSync(dir).filter(function (file) {
            //  Only add js files
            return path.extname(file) === '.js';
        }).forEach(function (file) {
            mocha.addFile(path.join(dir, file));
        });

        mocha.run()
            .on('pass', function (test) {
                var testObj = {
                    'title': test.title,
                    'passed': true,
                    'error': null
                };
                result.push(testObj);
                this.total += 1;
                this.pass += 1;
            })
            .on('fail', function (test, err) {
                var testObj = {
                    'title': test.title,
                    'passed': false,
                    'error': err
                };
                result.push(testObj);
                this.total += 1;
            })
            .on('end', function () {
                self._testResult.resolve(result);
            });
    }
}

module.exports = TestClient;
