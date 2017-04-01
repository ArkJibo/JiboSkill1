'use strict';

var util = require('./util');
var moment = require('moment');
var eventObj = require('./core/event/event');

class Metrics {
    constructor(eventBus) {
        var self = this;
        self._eventBus = eventBus;

        self._eventBus.addEventListener(eventObj.UNKNOWN_USER_INPUT, this, function(param) {
            var emitParams = {
                type: 'errorReport',
                subtype: 'default',
                doc: {
                    input: param.input,
                    date: param.date
                },
                _cb: param._cb
            }
            self._eventBus.emitEvent(eventObj.DATABASE_ADD, emitParams);
        });

        self._eventBus.addEventListener(eventObj.COMMAND_REPORT_ADD, this, function(param) {
            var inputIndividualData = {
                date: moment().format('x'),
                input: param.inputParams
            }
            var emitParams = {
                type: 'commandReport',
                fetchParams: {
                    'command': param.command
                },
                _cb: function(err, docs) {
                    if (err) {
                        console.log(err);
                    }
                    if (Object.keys(docs).length == 0) {
                        var addEmitParams = {
                            type: 'commandReport',
                            subtype: 'default',
                            doc: {
                                command: param.command,
                                totalUsage: 1,
                                individualData: [inputIndividualData]
                            },
                            _cb: param._cb
                        }
                        self._eventBus.emitEvent(eventObj.DATABASE_ADD, addEmitParams);
                    } else {
                        var updateEmitParams = {
                            type: 'commandReport',
                            params: {
                                'command': param.command
                            },
                            updates: {
                                $push: {
                                    'individualData': paramIndividualData
                                }
                            },
                            _cb: param._cb
                        }
                        self._eventBus.emitEvent(eventObj.DATABASE_UPDATE, updateEmitParams);
                    }
                }
            }
            self._eventBus.emitEvent(eventObj.DATABASE_FETCH, emitParams);
        });

        self._eventBus.addEventListener(eventObj.DAILY_REPORT_ADD, this, function(param) {
            var inputIndividualData = {
                command: param.command,
                date: moment().startOf('d').format('x'),
                time: moment().format('x')
            }

            var emitParams = {
                type: 'dailyReport',
                fetchParams: {
                    'date': inputIndividualData.date
                },
                _cb: function(err, docs) {
                    if (err) {
                        param._cb(err);
                    }
                    if (Object.keys(docs).length == 0) {
                        var addEmitParams = {
                            type: 'dailyReport',
                            subtype: 'default',
                            doc: {
                                firstInteraction: param.time,
                                totalUsage: 1,
                                individualData: [{
                                    command: param.command,
                                    time: param.time
                                }]
                            },
                            _cb: param._cb
                        }
                        self._eventBus.emitEvent(eventObj.DATABASE_ADD, addEmitParams);
                    } else {
                        var updateEmitParams = {
                            type: 'dailyReport',
                            params: {
                                'date': inputIndividualData.date
                            },
                            updates: {
                                $push: {
                                    'interactions': {
                                        command: param.command,
                                        time: param.time
                                    }
                                }
                            },
                            _cb: param._cb
                        }
                        self._eventBus.emitEvent(eventObj.DATABASE_UPDATE, updateEmitParams);
                    }
                }
            }
            self._eventBus.emitEvent(eventObj.DATABASE_FETCH, emitParams);
        });
    }
}
module.exports = Metrics;
