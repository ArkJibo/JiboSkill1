'use strict';

var Mocha = require('mocha');
var fs = require('fs');
var path = require('path');

module.exports = function (asrResult, speakerIds) {
    //  Get the variables set by main.rule
    var params = asrResult.NLParse;
    if (params.action === 'testing') {
        var dir = '';
        switch (params.type) {
            case 'unit':
                dir = './test/unit/';
                break;

            case 'functional':
            case 'func':
                dir = './test/func/';
                break;
        }

        console.log('Running ' + params.type + ' tests in directory ' + dir);

        //  Add all the tests in the folder to mocha
        var mocha = new Mocha();
        fs.readdirSync(dir).filter(function (file) {
            //  Only add js files
            return path.extname(file) === '.js';
        }).forEach(function (file) {
            mocha.addFile(path.join(dir, file));
        });

        //  Run the tests
        mocha.run(function (failures) {
            process.on('exit', function () {
                process.exit(failures);
            });
        });
    }
};
