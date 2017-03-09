'use strict';

var Util = require('./util');

var moment = require('moment');

var metricsEventEmitter = require('../src/core/event/event-bus.js').EventEmitter;


var init = function(EventI) {

    EventI.on('UNKNOWN_USER_INPUT', function(data, cb) {

        EventI.emit('DATABASE_ADD', {
            type: 'errorReport',
            doc: data
        }, function(err, docs) {
            if (err) {
                cb(err);
            } else {
                cb(docs);
            }
        });
        var err;
        cb(err, data);
    });

    EventI.on('COMMAND_REPORT_ADD', function(com, params, cb) {

        var paramIndividualData = {
            date: moment().toISOString(),
            input: params
        }


        EventI.emit('DATABASE_FETCH', {
            type: 'commandReport',
            fetchParams: {
                'command': com
            }
        }, function(err, docs) {
            if (err) {
                cb(err);
            }
            if (Object.keys(docs).length == 0) {

                EventI.emit('DATABASE_ADD', {
                    type: 'commandReport',
                    doc: {
                        command: com,
                        totalUsage: 1,
                        individualData: [paramIndividualData]
                    }
                }, function(err, docs) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(docs);
                    }
                });
            } else {
                EventI.emit('DATABASE_UPDATE', 'commandReport', {
                    'command': com
                }, {
                    $push: {
                        'individualData': paramIndividualData
                    }
                }, function(err, docs) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(docs);
                    }
                });
            }
            cb(err, paramIndividualData);
        });

        cb( null, paramIndividualData);

    });

    EventI.on('DAILY_REPORT_ADD', function(param, cb) {

        var param = {
            command: param,
            date: moment().startOf('d').toISOString(),
            time: moment().toISOString()
        }

    EventI.emit('DATABASE_FETCH', {
        type: 'dailyReport',
        fetchParams: {
            'date': param.date
        }
    }, function(err, docs) {
        if (err) {
            cb(err);
        }
        if (Object.keys(docs).length == 0) {

            EventI.emit('DATABASE_ADD', {
                type: 'dailyReport',
                doc: {
                    firstInteraction:  param.time,
                    totalUsage: 1,
                    individualData: [{
                          command: param.command,
                          time: param.time
                    }]
                }
            }, function(err, docs) {
                if (err) {
                    cb(err);
                } else {
                    cb(docs);
                }
            });
        } else {
            EventI.emit('DATABASE_UPDATE', 'dailyReport', {
                'command': param.command
            }, {
                $push: {
                    'interactions': {
                          command: param.command,
                          time: param.time
                    }
                }
            }, function(err, docs) {
                if (err) {
                    cb(err);
                } else {
                    cb(docs);
                }
            });
        }
        cb(err, param);
    });

    cb( null, param);

});


};


module.exports.init = init;
