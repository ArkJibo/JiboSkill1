'use strict';

var events = require('../src/core/event/event');
var Listener = require('./listener');

class ScheduleListener extends Listener {

    constructor (blackboard, notepad) {
        super(blackboard, notepad);
    }

    /**
     * @param nlparse The result of the speech parse
     * @param cb Callback to succeed this behavior
     */
    process (nlparse, cb) {
        var self = this;

        //  Validate date
        if (nlparse.status === 'NO-PARSE' || nlparse.date === 'NO-PARSE') {
            //  Bad date, set loop condition to true
            self.notepad.addItem({
                name: 'listenTimeWhile',
                item: true
            });
            cb();
        } else {
            //  Fetch the schedule for that date
            var momentDate = self.getDateFromSpeech(nlparse.date);
            self.blackboard.eventBus.emitEvent(events.FETCH_SCHEDULE, {
                date: momentDate
            }, function (err, schedule) {
                //  Post results to notepad
                self.notepad.addFetchResult(events.FETCH_SCHEDULE, err, schedule);
                self.notepad.addItem({
                    name: 'listenTimeWhile',
                    item: false
                });
                cb();
            });
        }
    }
}

module.exports = ScheduleListener;
