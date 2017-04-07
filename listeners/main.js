'use strict';

var Mocha = require('mocha');
var fs = require('fs');
var path = require('path');

class MainListener {

    constructor () {}

    process (params, speakerIds) {
        //  Get the variables set by main.rule
        switch (params.action) {
            case 'testing':
                //  Call listener for handling testing

            //  Future cases/listeners go here
        }
    }
}

module.exports = MainListener;
