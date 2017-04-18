'use strict';

var moment = require('moment');
var events = require('../src/core/event/event');
var util = require('../src/util');
var Listener = require('./listener');

class EventDetailsListener extends Listener {

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
            //  Bad date/time, set loop condition to true
            self.notepad.addItem({
                name: 'listenTimeWhile',
                item: true
            });
            cb();
        } else {
            //  Get the day
            var momentDate = self.getDateFromSpeech(nlparse.date).startOf('day');
            var searchParams = {
                type: nlparse.type
            };

            //  Check if there's a time also
            if (nlparse.time !== 'null') {
                //  Add the time to momentDate
                var momentTime = moment(nlparse.time, 'hh:mm A');
                momentDate.hour(momentTime.hour()).minute(momentTime.minute());

                //  Set params
                searchParams.time = momentDate.format('x');
            } else {
                //  No specific time, search the whole day
                searchParams._custom = [{
                    key: 'time',
                    op: 'gte',
                    value: momentDate.format('x')
                }, {
                    key: 'time',
                    op: 'lt',
                    value: momentDate.endOf('day').format('x')
                }];
            }

            //  Fetch the event
            self.blackboard.eventBus.emitEvent(events.DATABASE_FETCH, {
                type: util.COLLECTION_TYPE.EVENTS,
                params: searchParams,
                _cb: function (err, event) {
                    //  Post results to notepad
                    self.notepad.addFetchResult(events.DATABASE_FETCH, err, event);
                    self.notepad.addItem({
                        name: 'listenTimeWhile',
                        item: false
                    });
                    cb();
                }
            });
        }
    }
}

module.exports = EventDetailsListener;
