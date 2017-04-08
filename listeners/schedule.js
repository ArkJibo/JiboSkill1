'use strict';

var events = require('../src/core/event/event');

class ScheduleListener {

    constructor (notepad) {
        var self = this;
        self.notepad = notepad;
    }

    /*
     * @param day The day of the schedule to fetch
     */
    process (day) {
        var self = this;

        //  Validate day


        //  Fetch the schedule for that day
        self.notepad.getItem('EventBus').emitEvent(events.FETCH_SCHEDULE, {

        })

        //  Post to notepad
    }
}

module.exports = ScheduleListener;
