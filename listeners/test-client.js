'use strict';

var Mocha = require('mocha');
var fs = require('fs');
var path = require('path');
var Q = require('q');

class TestClient {

    constructor () {
      var self = this;
      self._testResult = Q.defer();
    }

    _getTestResult(){
      var self = this;
      return self._testResult.promise;
    }

    _runTest(asrResult, speakerIds){
      var self = this;

      //  Get the variables set by main.rule
      var params = asrResult.NLParse;
      if (params.action === 'testing') {
          var dir = '';
          switch (params.type) {
              case 'unit':
                  dir = './test/unit/';
                  break;

              case 'func':
                  dir = './test/func/';
                  break;
          }

          console.log('Running ' + params.type + ' tests in directory ' + dir);

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

          var result = [];

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

module.exports = TestClient;
