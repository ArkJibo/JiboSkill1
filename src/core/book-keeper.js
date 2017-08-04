'use strict';

var events = require('./event/event');
var config = require('../../config/default');

class BookKeeper {
    constructor (eventBus) {

        eventBus.emitEvent(events.FILL_REMINDER_QUEUE, { }, function () {

        });

        setInterval(function () {
            eventBus.emitEvent(events.FETCH_NEXT_REMINDER, {}, function (err, data) {
                if (err) {
                    console.err('Problem with events.FETCH_NEXT_REMINDER: ' + err);
                    return;
                }

                var date = new Date();
                var now = date.getTime();

                // add field 'itemType' to JSON data object
                if (data.time < now) {
                    data.itemType = 'reminder';
                    eventBus.emitJiboEvent('INTERRUPT_IDLE', data);
                }
            });
        }, config.fetchReminderInterval);
    }

}

module.exports = BookKeeper;
