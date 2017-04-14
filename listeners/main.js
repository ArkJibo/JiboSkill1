'use strict';

class MainListener {

    constructor (blackboard, notepad) {
        var self = this;
        self.notepad = notepad;
        self.blackboard = blackboard;
    }

    /**
     * @param result Contains the result of the voice interpretation
     * @param cb Callback
     */
    process (result, cb) {
        var self = this;

        //  Get the variables set by main.rule
        switch (result.action) {
            case 'testing':
                //  Call listener for handling testing

                break;

            case 'schedule':
                var ScheduleListener = require('./schedule');
                var scheduleListener = new ScheduleListener(self.blackboard, self.notepad);
                scheduleListener.process(result, cb);
                break;
        }
    }
}

module.exports = MainListener;
