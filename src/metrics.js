'use strict';

var Datastore = require('nedb');
var moment = require('moment');
var Util = require('./util');
var Errors = require('./errors');
var async = require('async');

var minKeys = {
    'commandReport': {
        'default': ['command', 'subtype', 'totalUsage', 'individualData']
    },
    'dailyReport': {
        'default': []
    }
};

class Metrics {
    constructor () {
        var self = this;
        //  Initialize collections
        self._db = {};
        self._db.commandReport = new Datastore('./db/commandReport.db');
        self._db.dailyReport = new Datastore('./db/dailyReport.db');


        Object.keys(self._db).forEach(collection => {
            self._db[collection].loadDatabase();
        });
    }


    /*  ToDo- Public Methods  ******************************************************************************************/




    /**
     * Add a command report to the collection
     *If the command report exists, push the new individual data into the array
     * @param params Params of command report
     * @param cb Callback
     */
    addToCommandReport (params, cb) {
        var self = this;

        self._getFromCollection ('commandReport', {command: params.command}, function (err, docs) {
                if(Object.keys(docs).length == 0){
                  self._addToCollection('commandReport', params, cb);
                }
                else{
                  self._updateInCollection('commandReport', {'command': params.command}, {$push: {'individualData':params.individualData}}, cb);
                }
        });
    }
    /**
     * Add a daily report to the collection
     *If the report for that day exists, push the new data into the array
     * @param params Params of command report
     * @param cb Callback
     */
    addToDailyReport (params, cb) {
        var self = this;

        self._getFromCollection ('dailyReport', {date: params.date}, function (err, docs) {
                if(Object.keys(docs).length == 0){
                  params['firstInteraction'] = params.time;
                  params['interactions'] = [{
                    command : params.command,
                    time : params.time
                  }];
                  delete params.time;
                  delete params.command;
                  self._addToCollection('dailyReport', params, cb);
                }
                else{
                  self._updateInCollection('dailyReport', {'date': params.date}, { $push: {'interactions': {command: params.command, time: params.time}}}, cb);
                }
        });
    }

    /**
     * Add a walk by to the daily report to the collection
     *If the report for that day has not been created yet, do so
     * @param params Params of command report
     * @param cb Callback
     */
    addWalkToDailyReport (params, cb) {
        var self = this;
        self._getFromCollection ('dailyReport', {date: params.date}, function (err, docs) {
                if(Object.keys(docs).length == 0){
                  params.walkBys = 1;
                  self._addToCollection('dailyReport', params, cb);
                }
                else{
                  self._updateInCollection('dailyReport', {date: params.date}, {  $set: { walkBys : 1+docs[0].walkBys }}, cb);
                }
        });
    }


    /**
     * Get command Report
     * @param params Params of commandReport
     * @param cb Callback
     */
    getcommandReport (params, cb) {
        var self = this;

        self._getFromCollection('commandReport', params, cb);
    }

    /**
     * Get daily Report
     * @param params Params of dailyReport
     * @param cb Callback
     */
    getDailyReport (params, cb) {
        var self = this;
        self._getFromCollection('dailyReport', params, cb);
    }


        /*  PRIVATE METHODS ******************************************************************************************/


        /**
         * Adder for Collection
         * @param collection Collection name
         * @param docs Object or array of Objects to add
         * @param cb Callback to pass result to
         */
        _addToCollection (collection, docs, cb) {
            var self = this;
            self._db[collection].insert(docs, cb);
        }


        /**
         * Getter for Collection
         * @param collection Collection name
         * @param params Params to match against
         * @param cb Callback to pass result to
         */
        _getFromCollection (collection, params, cb) {
            var self = this;
            self._db[collection].find(params, cb);
        }
        /**
         * Updater for Collection
         * @param collection Collection name
         * @param params Params to match against
         * @param updates The updates
         * @param cb Callback to pass result to
         */
        _updateInCollection (collection, params, updates, cb) {
            var self = this;
            // Can provide entire doc to replace or pass operations
            self._db[collection].update(
                params,
                updates, {
                    multi: true,
                    returnUpdatedDocs: true,
                },
                cb
            );
        }


}

module.exports = Metrics;
