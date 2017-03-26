'use strict';

var util = require('../util');
var moment = require('moment');
var eventObj = require('./event/event');


class BookKeeper {
    constructor(eventBus) {
        var self = this;
        self._eventBus = eventBus;

        /**
         * Listener for Clearing past records
         * @param param.type = event type to cleanup
         * @param param.time = delete events older than this many days
         */
        self._eventBus.addEventListener(eventObj['CLEAR_PAST_RECORDS'], this, function(param) {
            var query = {
                type: param.type,
                time: {
                    $lt: moment().subtract(param.time, 'd').format('x')
                }
            };
            var emitParams = {
                type: util.COLLECTION_TYPE.EVENTS,
                params: query,
                _cb: param._cb
            }
            self._eventBus.emitEvent(eventObj['DATABASE_REMOVE'], emitParams);
        });

        /**
         * Listener for emailing a metrics report
         * @param param.query = params for what reports to fetch
         * @param param.time = delete events older than this many days
         */
        self._eventBus.addEventListener(eventObj['EMAIL_METRICS_REPORT'], this,
            function(param) {
                //to-do: auto formatting for different report types
                var content = {
                    fromEmail: "recipient",
                    fromName: "Jibo Dev",
                    subject: "Report",
                    body: "Report body",
                    attachments: null
                };

                var emitParams = {
                    type: util.COLLECTION_TYPE.METRICS,
                    params: param.query,
                    _cb: function(err, docs) {
                        //to-do process docs for content
                        self._eventBus.emitEvent(eventObj['SEND_EMAIL'], content);
                        if (err)
                            cb(err);
                    }
            }
            self._eventBus.emitEvent(eventObj['DATABASE_FETCH'], emitParams);



        });


}


}

module.exports = BookKeeper;
