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
    }

    resetPromise(){
      var self = this;
      self._testResult = Q.defer();
      self._testName = Q.defer();
    }

    getTestResult(){
      var self = this;
      return self._testResult.promise;
    }

    getTestName(){
      var self = this;
      return self._testName.promise;
    }

    runTest(asrResult, speakerIds){
      var self = this;
      var result = [];
      var status = undefined;

      //  Get the variables set by main.rule
      var params = asrResult.NLParse;
      if (params.action === 'testing') {
          var dir = '';
          switch (params.type) {
              case 'unit':
                  dir = './test/unit/';
                  break;

              case 'functional':
                  dir = './test/func/';
                  break;
              default:
                  status = {
                    "status": false,
                    "msg": "Can't run unknown tests!"
                  };
                  self._testName.resolve(status);
                  break;
          }
          if (status == undefined){

            var alertMsg = ('Running ' + params.type + ' tests in directory ' + dir);
            status = {
              "status": true,
              "msg": alertMsg
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
            .on('test', function(test) {

            })
            .on('test end', function(test) {

            })
            .on('pass', function(test) {
              var testObj = {
                "title": test.title,
                "passed": true,
                "error": null
              };
              result.push(testObj);

            })
            .on('fail', function(test, err) {
              var testObj = {
                "title": test.title,
                "passed": false,
                "error": err
              };
              result.push(testObj);

            })
            .on('end', function() {

              self._testResult.resolve(result);

            });
        }
      }
    }
}

module.exports = TestClient;
