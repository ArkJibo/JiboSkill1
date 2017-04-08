'use strict';

class MainListener {

    constructor (notepad) {
        var self = this;
        self.notepad = notepad;
    }

    /**
     * @param params Contains the result of the voice interpretation
     */
    process (params) {
        var self = this;

        //  Get the variables set by main.rule
        switch (params.action) {
            case 'testing':
                //  Call listener for handling testing

                break;

            case 'schedule':
                var ScheduleListener = require('./schedule');
                var scheduleListener = new ScheduleListener(self.notepad);
                scheduleListener.process(params.day);
                break;
        }
    }
}

module.exports = MainListener;
