'use strict';

var moment = require('moment');

class Listener {

    constructor (blackboard, notepad) {
        var self = this;
        self.blackboard = blackboard;
        self.notepad = notepad;
    }

    /**
     * @param date Date interpreted from speech recognition
     * @return a moment object of that date
     */
    getDateFromSpeech (date) {
        //  Can be in absolute form 'mm/dd' or relative form '(-)(#)(d/w/m/y)'
        var momentDate = null;
        if (date.match(/-?\d+[dwmy]/i)) {
            //  Relative form
            var split = date.split('');
            if (split[0] === '-') {
                //  In the past
                momentDate = moment().subtract(split[1], split[2]);
            } else {
                //  In the future
                momentDate = moment().add(split[0], split[1]);
            }
        } else {
            momentDate = moment(date, 'MM/DD');
        }

        return momentDate;
    }
}

module.exports = Listener;
