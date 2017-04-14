'use strict';

var moment = require('moment');
var events = require('../src/core/event/event');

class ScheduleListener {

    constructor (blackboard, notepad) {
        let self = this;
        self.blackboard = blackboard;
        self.notepad = notepad;
    }

    /**
     * @param result The result of the speech parse
     * @param cb Callback
     */
    process (result, cb) {
        let self = this;

        //  Validate date
        if (result.status === 'NO-PARSE' || result.date === 'NO-PARSE') {
            //  Bad date, set loop condition to true
            console.log('Setting scheduleWhile to true');
            self.notepad.addItem({
                name: 'scheduleWhile',
                item: true
            });
            cb();
        } else {
            //  Get date, can be in absolute form 'mm/dd' or relative form '(-)(#)(d/w/m/y)'
            let momentDate = null;
            if (result.date.match(/-?\d+[dwmy]/i)) {
                //  Relative form
                let split = result.date.split('');
                if (split[0] === '-') {
                    //  In the past
                    momentDate = moment().subtract(split[1], split[2]);
                } else {
                    //  In the future
                    momentDate = moment().add(split[0], split[1]);
                }
            } else {
                momentDate = moment(result.date, 'MM/DD');
            }

            //  Fetch the schedule for that date
            self.blackboard.eventBus.emitEvent(events.FETCH_SCHEDULE, {
                date: momentDate,
                _cb: function (err, schedule) {
                    //  Post results to notepad
                    self.notepad.addFetchResult(events.FETCH_SCHEDULE, err, schedule);
                    self.notepad.addItem({
                        name: 'scheduleWhile',
                        item: false
                    });
                    cb();
                }
            });
        }
    }
}

module.exports = ScheduleListener;
