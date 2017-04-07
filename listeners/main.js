'use strict';

var Mocha = require('mocha');
var fs = require('fs');
var path = require('path');
var moment = require('moment');

class MainListener {

    constructor () {}

    process (params, speakerIds) {
        //  Get the variables set by main.rule
        switch (params.action) {
            case 'testing':
                //  Call listener for handling testing

                break;

            case 'schedule':
                console.log('IT CALENDAR');
        }
    }
}

module.exports = MainListener;
