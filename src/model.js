'use strict';

var Datastore = require('nedb');
var moment = require('moment');
var util = require('./util');
var Errors = require('./errors');
var async = require('async');
var _ = require('lodash');

var minRepeatInfoKeys = ['type', 'startTime', 'interval', 'endTime'];
var minReminderInfoKeys = ['type', 'numReminders', 'interval', 'startTime'];
var minCollectionKeys = {
    'events': {
        'default': ['type', 'subtype', 'time', 'repeatInfo', 'reminderInfo']
    },
    'inventory': {
        'supply': ['type', 'name', 'amount'],
        'record': ['type', 'date', 'purchased']
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
var dateKeys = ['time', 'lastTaken', 'startTime', 'endTime', 'birthday', 'dateAdded', 'lastUsed'];

class Model {

    constructor () {
        var self = this;

        //  Initialize collections
        self._db = {};
        self._db.events = new Datastore('./db/events.db');
        self._db.reminderQueue = new Datastore('./db/reminderQueue.db');
        self._db.inventory = new Datastore('./db/inventory.db');
        self._db.patient = new Datastore('./db/patient.db');
        self._db.people = new Datastore('./db/people.db');
        self._db.media = new Datastore('./db/media.db');
        self._db.entertainment = new Datastore('./db/entertainment.db');
        self._db.voice = new Datastore('./db/voice.db');

        Object.keys(self._db).forEach(function(col) {
            self._db[col].loadDatabase();
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
        var params = self._processCustomMatchingParams({
            _custom: [{
                key: 'time',
                op: 'gte',
                value: start
            }, {
                key: 'time',
                op: 'lt',
                value: end
            }]
        });

        //  Get all events of the day
        self._getFromCollectionSorted('events', params, {
            time: 1
        }, cb);
    }

    /**
     * Get the next upcoming reminder and clear past reminders
     * @param cb Callback
     */
    getNextReminder (cb) {
        var self = this;

        //  First remove any expired reminders
        self._removeFromCollection('reminderQueue', {
            time: {
                $lte: moment().toISOString()
            }
        }, {
            multi: true
        }, function (err, numRemoved) {
            if (err) {
                cb(err);
            } else {
                //  Get all reminders and sort
                self._getFromCollectionSorted(
                    'reminderQueue',
                    {},
                    { time: 1 },    //  1 means ascending order
                    function (err, docs) {
                        //  Return earliest reminder
                        cb(err, docs.length === 0 ? null : docs[0]);
                    }
                );
            }
        });
    }

    /**
     * Get the next upcoming event that matches the params
     * @param type JIBO_EVENT_TYPE
     * @param params Params to match against
     * @param cb Callback
     */
    getNextMatchingEvent (type, params, cb) {
        var self = this;

        //  Get all events and sort
        if (type) {
            params.type = type;
        }
        self._getFromCollectionSorted('events', params, {
            time: 1
        }, function (err, docs) {
                cb(err, docs ? docs[0] : null);
        });
    }

    /**
     * Get events from the database that match params
     * @param params Params to match against
     * @param cb Callback
     */
    getMatchingEvents (params, cb) {
        var self = this;

        //  Process custom params and fetch
        params = self._processCustomMatchingParams(params);
        self._getFromCollection('events', params, cb);
    }

    /**
     * Get inventory items that match params
     * @param params Params to match against
     * @param cb Callback
     */
    getMatchingInventory (params, cb) {
        var self = this;

        //  Process custom params and fetch
        params = self._processCustomMatchingParams(params);
        self._getFromCollection('inventory', params, cb);
    }

    /**
     * Get patient info that matches params
     * @param params Params to match against
     * @param cb Callback
     */
    getMatchingPatientInfo (params, cb) {
        var self = this;
        self._getFromCollection('patient', params, cb);
    }

    /**
     * Get info about a person or people in the patient's life
     * @param Params to match against
     * @param cb Callback
     */
    getMatchingPersonInfo (params, cb) {
        var self = this;

        //  Process custom params and fetch
        params = self._processCustomMatchingParams(params);
        self._getFromCollection('people', params, cb);
    }

    /**
     * Get random Media based on params
     * @param params Params to match against
     * @param cb Callback
     */
    getMatchingMedia (params, cb) {
        var self = this;

        //  Process custom params and fetch
        params = self._processCustomMatchingParams(params);
        self._getFromCollection('media', params, cb);
    }

    /**
     * Get a random entertainment object that matches the params
     * @param params Params to match against
     * @param cb Callback
     */
    getMatchingEntertainment (params, cb) {
        var self = this;

        //  Process custom params and fetch
        params = self._processCustomMatchingParams(params);
        self._getFromCollection('entertainment', params, function (err, docs) {
            var random = Math.floor(Math.random() * docs.length);
            cb(err, docs[random], docs.length);
        });
    }

    /**
     * Get voice line matching params
     * @param params Params to match against
     * @param cb Callback
     */
    getMatchingVoice (params, cb) {
        var self = this;

        self._getFromCollection('voice', params, cb);
    }

    /**
     * Updates the matching events of the specified collection
     * @param type JIBO_COLLECTION_TYPE
     * @param params Params to match against
     * @param update Updates to perform
     * @param cb Callback
     */
    updateCollection (type, params, update, cb) {
        var self = this;

        //  Process custom params
        params = self._processCustomMatchingParams(params);
        update = self._processCustomUpdateParams(update);

        if (!self._db[type]) {
            //  Invalid collection
            cb(Errors.INVALID_COLLECTION);
        } else {
            self._updateInCollection(
                type,
                params,
                update, {
                    multi: true,
                    returnUpdatedDocs: true
                },
                cb
            );
        }
    }

    /**
     * Removes matching events from the specified collection
     * @param type JIBO_COLLECTION_TYPE
     * @param params Params to match against
     * @param cb Callback
     */
    removeFromCollection (type, params, cb) {
        var self = this;

        //  Process custom params
        params = self._processCustomMatchingParams(params);

        if (!self._db[type]) {
            //  Invalid collection
            cb(Errors.INVALID_COLLECTION);
        } else {
            self._removeFromCollection(type, params, {
                multi: true
            }, cb);
        }
    }

    /**
     * Adds a new event to database
     * @param params Event JS object
     * @param cb Callback
     */
    addNewEvent (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('events', 'default', params, function (err, params) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('events', params, cb);
            }
        });
    }

    /**
     * Adds a new inventory item to database
     * @param params Inventory item
     * @param cb Callback
     */
    addNewInventory (params, cb) {
        var self = this;

        //  Type must be supply or record
        if (!params || (params.type !== 'supply' && params.type !== 'record')) {
            cb(Errors.INVALID_INVENTORY);
            return;
        }

        //  Verify correct params
        self._verifyCollectionParams('inventory', params.type, params, function (err, params) {
            if (err) {
                cb(err);
            } else {
                //  All is good, add to collection
                self._addToCollection('inventory', params, cb);
            }
        });
    }

    /**
     * Queue reminder
     * @param params Params of reminder
     * @param cb Callback
     */
    addReminder (params, cb) {
        var self = this;

        //  Verify correct params
        self._verifyCollectionParams('reminderQueue', 'default', params, function (err) {
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
        self._verifyCollectionParams('patient', 'default', params, function (err) {
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
        self._verifyCollectionParams('people', 'default', params, function (err) {
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
        self._verifyCollectionParams('media', 'default', params, function (err) {
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
        self._verifyCollectionParams('entertainment', 'default', params, function (err) {
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
        self._verifyCollectionParams('voice', 'default', params, function (err) {
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
     * util function to verify minimum params of any collection type
     * @param collection The collection type
     * @param docType Type of doc within the collection
     * @param params Params to verify
     * @param cb Callback
     */
    _verifyCollectionParams (collection, docType, params, cb) {
        var self = this;

        //  Verify collection/docType
        if (!minCollectionKeys[collection]) {
            cb(Errors.INVALID_COLLECTION);
            return;
        } else if (!minCollectionKeys[collection][docType]) {
            cb(Errors.INVALID_DOCTYPE);
            return;
        }
        var keys = minCollectionKeys[collection][docType];

        //  Verify all the things
        var paramsCheck = self._checkForKeys(params, keys);
        var repeatCheck = !keys.repeatInfo || self._checkForKeys(params.repeatInfo, minRepeatInfoKeys);
        var remindCheck = !keys.reminderInfo || self._checkForKeys(params.reminderInfo, minReminderInfoKeys);

        //  Validate any date params
        params = self._dateCheckAndConvert(params);
        if (!params) {
            cb(Errors.INVALID_DATE);
        } else if (!(paramsCheck && repeatCheck && remindCheck)) {
            cb(Errors.KEY_MISSING);
        } else {
            cb(null, params);   //  Success
        }
    }

    /**
     * Check params for any date keys, validate, and convert to ISO string
     * @param params Params containing date keys
     * @return modified params or null if invalid dates present
     */
    _dateCheckAndConvert (params) {
        var self = this;

        //  Loop over each key
        var ret = Object.keys(params).every(function (key) {
            if (typeof params[key] === 'object') {
                //  Recurse
                self._dateCheckAndConvert(params[key]);
            } else {
                //  Check if key is a date key
                var i = _.indexOf(dateKeys, key);
                if (i >= 0) {
                    //  Is date, make sure it's valid
                    if (moment(params[key]).isValid()) {
                        //  Convert to ISO string
                        params[key] = moment(params[key]).toISOString();
                    } else {
                        //  Invalid, abort everything
                        return false;
                    }
                }
            }
            return true;
        });

        return ret ? params : null;
    }

    /**
     * Checks if the obj contains the keys
     * @param obj Object to check
     * @param keys Keys to look for
     */
    _checkForKeys (obj, keys) {
        var self = this;

        if (!obj || !keys) {
            return false;
        }

        //  Every key must be in the object
        for (var i = 0; i < keys.length; i++) {
            if (!_.has(obj, keys[i])) {
                return false;
            }
        }
        return true;
    }

    /**
     * Processes custom matching params passed to getter functions
     * @param params Params to convert into NeDB speak
     * @return modified params
     */
    _processCustomMatchingParams (params) {
        if (!params._custom) {
            return params;
        }

        //  String multiple queries with an AND
        if (params._custom.length > 1) {
            params.$and = [];
        }

        //  Go through each custom key
        params._custom.forEach(function (obj) {
            //  Error checking
            if (!obj.key || !obj.op || !obj.value) {
                //  Log error and ignore obj
                console.log('Custom object missing key, op, or value');
                return;
            }

            var supportedOps = ['lt', 'lte', 'gt', 'gte'];
            if (!_.includes(supportedOps, obj.op)) {
                //  Log error and ignore obj
                console.log('Unsupported op in custom object');
                return;
            }

            //  Convert to NeDB logic
            if (params.$and) {
                var o = {};
                o[obj.key] = {};
                o[obj.key]['$' + obj.op] = obj.value;
                params.$and.push(o);
            } else {
                params[obj.key] = {};
                params[obj.key]['$' + obj.op] = obj.value;
            }
        });

        delete params._custom;
        return params;
    }

    /**
     * Processes custom update params
     * @param params Params to process
     * @return modified params
     */
    _processCustomUpdateParams (params) {
        //  Map of our custom ops to NeDB ops
        var supportedOps = {
            '_set': '$set',
            '_unset': '$unset',
            '_inc': '$inc'
        };
        //  Check if params contain ops or is a new doc to replace
        var isNewDoc = true;
        Object.keys(supportedOps).forEach(function (op) {
            if (!_.isNil(params[op])) {
                isNewDoc = false;
            }
        });

        if (isNewDoc) {
            //  Is new doc
            return params;
        } else {
            //  Update ops, process them
            Object.keys(params).forEach(function (key) {
                if (!supportedOps[key]) {
                    delete params[key];
                    return;
                }

                //  Convert our custom ops to NeDB specific
                params[supportedOps[key]] = _.cloneDeep(params[key]);
                delete params[key];
            });

            return params;
        }
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
     * Getter for Collection that sorts results
     * @param collection Collection name
     * @param params Params to match against
     * @param sortBy What to sort by
     * @param cb Callback
     */
    _getFromCollectionSorted (collection, params, sortBy, cb) {
        var self = this;
        self._db[collection].find(params).sort(sortBy).exec(cb);
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
     * @param options Options for removal
     * @param cb Callback to pass result to
     */
    _removeFromCollection (collection, params, options, cb) {
        var self = this;
        self._db[collection].remove(params, options, cb);
    }

    /**
     * Updater for Collection
     * @param collection Collection name
     * @param params Params to match against
     * @param updates Updates
     * @param options Update options, NeDB specific
     * @param cb Callback to pass result to
     */
    _updateInCollection (collection, params, updates, options, cb) {
        var self = this;

        // Can provide entire doc to replace or pass operations
        self._db[collection].update(params,updates, options, cb);
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
