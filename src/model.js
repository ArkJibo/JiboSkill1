'use strict';

var Datastore = require('nedb');
var moment = require('moment');
var Util = require('./util');
var Errors = require('./errors');
var async = require('async');

var minRepeatInfoKeys = ['type', 'startTime', 'interval', 'endTime'];
var minReminderInfoKeys = ['type', 'numReminders', 'interval', 'startTime'];

class Model {
    constructor () {
        var self = this;

        //  Initialize collections
        self._db = {};
        self._db.appointment = new Datastore('./db/appointment.db');
        self._db.bill = new Datastore('./db/bill.db');
        self._db.entertainment = new Datastore('./db/entertainment.db');
        self._db.exercise = new Datastore('./db/exercise.db');
        self._db.media = new Datastore('./db/media.db');
        self._db.medication = new Datastore('./db/medication.db');
        self._db.patient = new Datastore('./db/patient.db');
        self._db.people = new Datastore('./db/people.db');
        self._db.reminderQueue = new Datastore('./db/reminderQueue.db');
        self._db.shopping = new Datastore('./db/shopping.db');
        self._db.stock = new Datastore('./db/stock.db');
        self._db.voice = new Datastore('./db/voice.db');

        Object.keys(self._db).forEach(collection => {
            self._db[collection].loadDatabase();
        });
    }

    /*  PUBLIC METHODS  ******************************************************************************************/

    /**
     * Get the entire schedule for today
     * @param cb Callback
     */
    getTodaySchedule (cb) {
        var self = this;

        var start = moment().startOf('day').toISOString();
        var end = moment().endOf('day').toISOString();
        var now = moment().toISOString();

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
                $gt: moment().startOf('day').toISOString(),
                $lt: moment().endOf('day').toISOString()
            };
            self._getFromCollection(toFetch.col, query, function (err, docs) {
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
            for (var i = 0; i < results.length; i++) {
                concat = concat.concat(results[i]);
            }
            cb(err, concat);
        });
    }

    /**
     * Get a random entertainment object that matches the params
     * @param params Params to match against
     * @param cb Callback
     */
    getEntertainment (params, cb) {
        var self = this;

        //  Process custom params
        if (params.custom) {
            Object.keys(params.custom).forEach(function (key) {
                //  Convert to nosql queries
                switch (key) {
                    case 'ratingMin':
                        params.rating = params.rating || {};
                        params.rating.$gte =  params.custom[key];
                        break;
                    case 'ratingMax':
                        params.rating = params.rating || {};
                        params.rating.$lte =  params.custom[key];
                        break;
                    case 'notUsedSince':
                        params.lastUsed = params.lastUsed || {};
                        params.lastUsed.$lte = params.custom[key];
                        break;
                    case 'notUsedBefore':
                        params.lastUsed = params.lastUsed || {};
                        params.lastUsed.$gte = params.custom[key];
                        break;
                }
            });
            delete params.custom;
        }

        self._getFromCollection('entertainment', params, function (err, docs) {
            var random = Math.floor(Math.random() * docs.length);
            cb(err, docs[random], docs.length);
        });
    }

    /**
     * Add appointment
     * @param param Params of appt
     * @param cb Callback
     */
    addAppointment (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('appointment', 'default', params, true, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('appointment', params, cb);
            }
        });
    }

    /**
     * Add medication
     * @param param Params of medication
     * @param cb Callback
     */
    addMedication (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('medication', 'default', params, true, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('medication', params, cb);
            }
        });
    }

    /**
     * Add exercise event
     * @param param Params of exercise
     * @param cb Callback
     */
    addExercise (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('exercise', 'default', params, true, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('exercise', params, cb);
            }
        });
    }

    /**
     * Add shopping doc
     * @param param Params of shopping
     * @param cb Callback
     */
    addShopping (params, cb) {
        var self = this;

        //  Verify correct params for either record doc or default doc
        var isRecord = params.itemsBought !== undefined;
        self._verifyCollectionParams('shopping', isRecord ? 'record' : 'default', params, !isRecord, function (err) {
            if (err) {
                cb(err);
            } else {
                if (isRecord) {
                    //  Make sure each array item has correct params
                    for (var i = 0; i < params.itemsBought.length; i++) {
                        if (!self._checkForKeys(params.itemsBought[i], ['name', 'amount'])) {
                            cb(Errors.KEY_MISSING);
                            return;
                        }
                    }
                }
                //  All is good, add to collection
                self._addToCollection('shopping', params, cb);
            }
        });
    }

    /**
     * Add info about current stock of household supplies
     * @param params Params of stock
     * @param cb Callback
     */
    addToStock (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('stock', 'default', params, false, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('stock', params, cb);
            }
        });
    }

    /**
     * Add new bill
     * @param params Params of bill
     * @param cb Callback
     */
    addBill (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('bill', 'default', params, false, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('bill', params, cb);
            }
        });
    }

    /**
     * Queue reminder
     * @param params Params of reminder
     * @param cb Callback
     */
    queueReminder (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('reminderQueue', 'default', params, false, function (err) {
            if (err) {
                cb(err);
            } else {
                //  Also make sure the _id of event exists
                self._getFromCollection(params.type, {
                    _id: params.event._id
                }, function (err, docs) {
                    if (err || docs.length === 0) {
                        cb(err || Errors.BAD_DOC_ID);
                        return;
                    }
                    //  All is good, add to collection
                    self._addToCollection('reminderQueue', params, cb);
                });
            }
        });
    }

    /**
     * Add more info about the patient
     * @param params Params about the new info
     * @param cb Callback
     */
    addPatientInfo (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('patient', 'default', params, false, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('patient', params, cb);
            }
        });
    }

    /**
     * Add info about a person in the patient's life
     * @param params Params of the person
     * @param cb Callback
     */
    addPerson (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('people', 'default', params, false, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('people', params, cb);
            }
        });
    }

    /**
     * Add new media relevant to the patient
     * @param params Params of media
     * @param cb Callback
     */
    addMedia (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('media', 'default', params, false, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('media', params, cb);
            }
        });
    }

    /**
     * Add entertainment to randomly show to patient
     * @param params Params of entertainment
     * @param cb Callback
     */
    addEntertainment (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('entertainment', 'default', params, false, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('entertainment', params, cb);
            }
        });
    }

    /**
     * Add a new voice line for interacting with patient
     * @param params Params of voice line
     * @param cb Callback
     */
    addVoiceLine (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('voice', 'default', params, false, function (err) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('voice', params, cb);
            }
        });
    }

    /*  PRIVATE METHODS ******************************************************************************************/

    /**
     * Util function to verify minimum params of any collection type
     * @param collection The collection type
     * @param docType Type of doc within the collection
     * @param params Params to verify
     * @param repeatRemind True if should verify repeatInfo and reminderInfo keys
     * @param cb Callback
     */
    _verifyCollectionParams (collection, docType, params, repeatRemind, cb) {
        var self = this;

        var dateKeys = {
            'appointment': {
                'default': ['time']
            },
            'medication': {
                'default': ['lastTaken']
            },
            'exercise': {
                'default': ['time']
            },
            'bill': {
                'default': ['time']
            },
            'reminderQueue': {
                'default': ['time']
            },
            'people': {
                'default': ['birthday']
            },
            'entertainment': {
                'default': ['dateAdded', 'lastUsed']
            },
            'voice': {
                'default': ['dateAdded']
            }
        };
        var minKeys = {
            'appointment': {
                'default': ['type', 'people', 'time', 'repeatInfo', 'reminderInfo']
            },
            'medication': {
                'default': ['name', 'type', 'lastTaken', 'repeatInfo', 'reminderInfo']
            },
            'exercise': {
                'default': ['name', 'time', 'repeatInfo', 'reminderInfo']
            },
            'shopping': {
                'default': ['toPurchase', 'repeatInfo', 'reminderInfo'],
                'record': ['date', 'itemsBought']
            },
            'stock': {
                'default': ['type', 'name', 'amount']
            },
            'bill': {
                'default': ['type', 'amount', 'time', 'repeatInfo', 'reminderInfo']
            },
            'reminderQueue': {
                'default': ['type', 'event', 'time']
            },
            'patient': {
                'default': ['type', 'subType', 'value']
            },
            'people': {
                'default': ['first', 'last', 'relationship', 'closeness', 'birthday']
            },
            'media': {
                'default': ['type', 'occasion', 'file', 'timesViewed']
            },
            'entertainment': {
                'default': ['type', 'dateAdded', 'lastUsed', 'rating']
            },
            'voice': {
                'default': ['type', 'line', 'dateAdded']
            }
        };

        //  Verify collection/docType args
        if (!minKeys[collection]) {
            cb(Errors.INVALID_COLLECTION);
            return;
        } else if (!minKeys[collection][docType]) {
            cb(Errors.INVALID_DOCTYPE);
            return;
        }
        var keys = minKeys[collection][docType];

        //  Verify all the things
        var paramsCheck = self._checkForKeys(params, keys);
        var repeatCheck = !repeatRemind || self._checkForKeys(params.repeatInfo, minRepeatInfoKeys);
        var remindCheck = !repeatRemind || self._checkForKeys(params.reminderInfo, minReminderInfoKeys);
        var paramsDateCheck = true;
        var repeatDateCheck = true;
        var remindDateCheck = true;

        if (dateKeys[collection]) {
            //  Bad params if docType is invalid
            if (!dateKeys[collection][docType]) {
                paramsDateCheck = false;
            } else {
                for (var i = 0; i < dateKeys[collection][docType].length; i++) {
                    paramsDateCheck = moment(params[dateKeys[collection][docType][i]]).isValid() && paramsDateCheck;
                    if (paramsDateCheck) {
                        //  Convert to ISO date for storage
                        params[dateKeys[collection][docType][i]] = moment(params[dateKeys[collection][docType][i]]).toISOString();
                    }
                }
            }
        }
        if (repeatRemind) {
            repeatDateCheck = params.repeatInfo && moment(params.repeatInfo.startTime).isValid() &&
                moment(params.repeatInfo.endTime).isValid();
            remindDateCheck = params.reminderInfo && moment(params.reminderInfo.startTime).isValid();
        }

        if (!(paramsCheck && repeatCheck && remindCheck)) {
            cb(Errors.KEY_MISSING);
        } else if (!(paramsDateCheck && repeatDateCheck && remindDateCheck)) {
            cb(Errors.INVALID_DATE);
        } else {
            cb();   //  Success
        }
    }

    /**
     * Checks if the obj contains the keys
     * @param obj Object to check
     * @param keys Keys to look for
     */
    _checkForKeys (obj, keys) {
        var self = this;

        if (!obj || typeof obj !== 'object') {
            return false;
        }

        for (var i = 0; i < keys.length; i++) {
            if (!(keys[i] in obj)) {
                return false;
            }
        }
        return true;
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
     * Remover for Collection
     * @param collection Collection name
     * @param params Params to match against
     * @param cb Callback to pass result to
     */
    _removeFromCollection (collection, params, cb) {
        var self = this;
        self._db[collection].remove(params, { multi: true }, cb);
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

    /**
     * Completely wipes a collection - USE WITH CAUTION
     * @param collection Collection name
     * @param cb Callback
     */
    _clearCollection (collection, cb) {
        var self = this;
        self._db[collection].remove({}, { multi: true }, cb);
    }
}

module.exports = Model;
