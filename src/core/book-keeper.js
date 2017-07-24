'use strict';

var events = require('./event/event');

class BookKeeper {
    constructor (eventBus) {
        eventBus.emitEvent(events.FILL_REMINDER_QUEUE, {
            cb: function () {
                setInterval(function () {
                    eventBus.emitEvent(events.FETCH_NEXT_REMINDER, {
                        cb: function (err, data) {
                            if(err) {
                                console.err('Problem with events.FETCH_NEXT_REMINDER: ' + err);
                            }

                            var date = new Date();
                            var now = date.getTime();
                            // add field 'itemType' to JSON data object
                            if(data.time < now) {
                                data['itemType'] = 'reminder';
                                eventBus.emitJiboEvent('INTERRUPT_IDLE', data);
                            } else {
                                // do nothing
                            }
                        }
                    });
                }, 1000);
            }
        });
    }
}

module.exports = BookKeeper;
