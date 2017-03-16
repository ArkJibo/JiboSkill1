'use strict';

var Util = require('./util');

var moment = require('moment');

var metricsEventEmitter = require('../src/core/event/event-bus.js').EventEmitter;


var init = function(EventI) {

    EventI.on('DELETE_OLD_SCHEDULE', function(col, days, cb) {

          var query = {};
          query[toFetch.date] = {
              $lt: moment().subtract(days, 'days').toISOString()
          };

        EventI.emit('DATABASE_REMOVE', {
            type: col,
            params: query
        }, function(err, numRemoved) {
            if (err) {
                cb(err);
            } else {
                cb(numRemoved);
            }
        });
    });

    EventI.on('CLEAN_SHOPPING_RECORDS', function(days, cb) {

              EventI.emit('DELETE_OLD_SCHEDULE',
                  'shopping',
                  days,
              function(err, numRemoved) {
                  if (err) {
                      cb(err);
                  } else {
                      cb(numRemoved);
                  }
              });
          });

    EventI.on('emailMetricsReport', function(report_type, params, cb) {

    EventI.emit('DATABASE_FETCH', {
        type: report_type,
        fetchParams: params
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











  /**
   * Deletes appointments older than a set amount of days
   * @param model Model object
   * @param days Will clear out records older than this amount of days
   * @param cb Callback
   */
  deleteOldSchedule (model, days, cb) {
      var self = this;

      //  Need to check appointments, medication, exercise, and bills
      var fetchFrom = [{
          col: 'appointment',
          date: 'time'
      }, {
          col: 'medication',
          date: 'lastTaken'
      }, {
          col: 'exercise',
          date: 'time'
      }, {
          col: 'bill',
          date: 'time'
      }];

      //  Define function for fetch docs
      var fetch = function (toFetch, cb) {
          var query = {};

          query[toFetch.date] = {
              $lt: moment().subtract(days, 'days').toISOString()
          };
           model._removeFromCollection(toFetch.col, query, function (err, docs) {
               cb(err, docs);
           });
      };

      //  Build list of queries for each collection to run in parallel
      var fetchFuncs = [];
      for (var i = 0; i < fetchFrom.length; i++) {
          fetchFuncs.push(fetch.bind(null, fetchFrom[i]));
      }

      async.parallel(fetchFuncs, function (err, results) {
          //  Concat all the returned doc arrays
          var concat = [];
            var cnt = 0;
          for (var i = 0; i < results.length; i++) {
              concat = concat.concat(results[i]);
              if (concat[i] == 1) {
                ++cnt;
              }
          }
          concat.numRemoved = cnt;
          cb(err, concat);
      });
    }

    /**
     * Deletes shopping records older than a set amount of days
     * @param model Model object
     * @param days Will clear out records older than this amount of days
     * @param cb Callback
     */
    deleteOldShopping (model, days, cb) {
        var self = this;

        //  Need to check shopping lists
        var fetchFrom = [{
            col: 'shopping',
            date: 'time'
        }];

        //  Define function for fetch docs
        var fetch = function (toFetch, cb) {
            var query = {};

            query[toFetch.date] = {
                $lt: moment().subtract(days, 'days').toISOString()
            };
             model._removeFromCollection(toFetch.col, query, function (err, docs) {
                 cb(err, docs);
             });
        };

        //  Build list of queries for each collection to run in parallel
        var fetchFuncs = [];
        for (var i = 0; i < fetchFrom.length; i++) {
            fetchFuncs.push(fetch.bind(null, fetchFrom[i]));
        }

        async.parallel(fetchFuncs, function (err, results) {
            //  Concat all the returned doc arrays
            var concat = [];
              var cnt = 0;
            for (var i = 0; i < results.length; i++) {
                concat = concat.concat(results[i]);
                if (concat[i] == 1) {
                  ++cnt;
                }
            }
            concat.numRemoved = cnt;
            cb(err, concat);
        });
      }
      /**
       * Gathers data from metrics database
       * with formatting for email client
       * @param params Params of which report database,
       *  who to email, and date ranges
       * @param cb Callback
       */
      emailMetricsReport (params, cb) {
          var self = this;

          //  Need to check shopping lists
          var fetchFrom = [{
              col: 'shopping',
              date: 'time'
          }];

          //  Define function for fetch docs
          var fetch = function (toFetch, cb) {
              var query = {};

              query[toFetch.date] = {
                  $lt: moment().subtract(30, 'days').toISOString()
              };
               model._removeFromCollection(toFetch.col, query, function (err, docs) {
                   cb(err, docs);
               });
          };

          //  Build list of queries for each collection to run in parallel
          var fetchFuncs = [];
          for (var i = 0; i < fetchFrom.length; i++) {
              fetchFuncs.push(fetch.bind(null, fetchFrom[i]));
          }

          async.parallel(fetchFuncs, function (err, results) {
              //  Concat all the returned doc arrays
              var concat = [];
                var cnt = 0;
              for (var i = 0; i < results.length; i++) {
                  concat = concat.concat(results[i]);
                  if (concat[i] == 1) {
                    ++cnt;
                  }
              }
              concat.numRemoved = cnt;
              cb(err, concat);
          });
        }





}

module.exports = BookKeeper;
