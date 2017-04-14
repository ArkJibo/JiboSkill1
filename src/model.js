/*jshint loopfunc: true */

'use strict';

var Datastore = require('nedb');
var moment = require('moment');
var util = require('./util');
var errors = require('./errors');
var async = require('async');
var _ = require('lodash');

var minRepeatInfoKeys = ['interval', 'endTime'];
var minReminderInfoKeys = ['numReminders', 'interval', 'startTime'];

var minCollectionKeys = {};
minCollectionKeys[util.COLLECTION_TYPE.EVENTS] = {
    default: ['type', 'subtype', 'time', 'reminderInfo']
};
minCollectionKeys[util.COLLECTION_TYPE.INVENTORY] = {
    supply: ['type', 'name', 'amount'],
    record: ['type', 'date', 'purchased']
};
minCollectionKeys[util.COLLECTION_TYPE.REMINDER_QUEUE] = {
    default: ['type', 'event', 'time']
};
minCollectionKeys[util.COLLECTION_TYPE.PATIENT] = {
    default: ['type', 'subtype', 'value']
};
minCollectionKeys[util.COLLECTION_TYPE.PEOPLE] = {
    default: ['first', 'last', 'relationship', 'closeness', 'birthday']
};
minCollectionKeys[util.COLLECTION_TYPE.MEDIA] = {
    default: ['type', 'occasion', 'file', 'timesViewed']
};
minCollectionKeys[util.COLLECTION_TYPE.ENTERTAINMENT] = {
    default: ['type', 'dateAdded', 'lastUsed', 'rating']
};
minCollectionKeys[util.COLLECTION_TYPE.VOICE] = {
    default: ['type', 'line', 'dateAdded']
};
minCollectionKeys[util.COLLECTION_TYPE.CREDS] = {
    default: ['type', 'password']
};
minCollectionKeys[util.COLLECTION_TYPE.EMAIL] = {
    default: ['fromEmail', 'fromFirstName', 'subject', 'body', 'date']
};

var dateKeys = ['time', 'date', 'lastTaken', 'startTime', 'endTime', 'birthday', 'dateAdded', 'lastUsed'];
var timeModifiers = {
    mm: 'minutes',
    h: 'hours',
    d: 'days',
    w: 'weeks',
    m: 'months',
    y: 'years'
};
var updateOptions = {
    multi: true,
    returnUpdatedDocs: true
};
var removeOptions = {
    multi: true
};

class Model {

    /**
     * Constructor
     * @param db Object containing db file names
     */
    constructor (db) {
        var self = this;

        //  Initialize collections
        self._db = {};
        self._db[util.COLLECTION_TYPE.EVENTS] = new Datastore(db.events);
        self._db[util.COLLECTION_TYPE.REMINDER_QUEUE] = new Datastore(db.reminderQueue);
        self._db[util.COLLECTION_TYPE.INVENTORY] = new Datastore(db.inventory);
        self._db[util.COLLECTION_TYPE.PATIENT] = new Datastore(db.patient);
        self._db[util.COLLECTION_TYPE.PEOPLE] = new Datastore(db.people);
        self._db[util.COLLECTION_TYPE.MEDIA] = new Datastore(db.media);
        self._db[util.COLLECTION_TYPE.ENTERTAINMENT] = new Datastore(db.entertainment);
        self._db[util.COLLECTION_TYPE.VOICE] = new Datastore(db.voice);
        self._db[util.COLLECTION_TYPE.CREDS] = new Datastore(db.credentials);
        self._db[util.COLLECTION_TYPE.EMAIL] = new Datastore(db.emails);

        Object.keys(self._db).forEach(function (col) {
            self._db[col].loadDatabase();
        });
    }

    /*  PUBLIC METHODS  ******************************************************************************************/

    /**
     * Fills the reminder queue with events of the day
     * @param cb Callback
     */
    fillTodayReminderQueue (cb) {
        var self = this;

        //  Get today's events
        self.getDaySchedule(moment(), function (err, docs) {
            if (err) {
                cb(err);
            } else {
                var reminders = [];

                //  Extract reminder info from each event
                docs.forEach(function (doc) {
                    //  Fill all reminders needed for this event
                    for (var i = 0; i < doc.reminderInfo.numReminders; i++) {
                        var interval = i * doc.reminderInfo.interval.value;
                        reminders.push({
                            type: doc.type,
                            eventID: doc._id,
                            viewed: false,
                            time: moment(parseInt(doc.reminderInfo.startTime)).add(
                                interval,
                                timeModifiers[doc.reminderInfo.interval.modifier]
                            ).format('x')
                        });
                    }
                });

                //  Add to reminder queue
                self._addToCollection('reminderQueue', reminders, cb);
            }
        });
    }

    /**
     * Get the entire schedule for a day
     * @param date The day to get schedule for
     * @param cb Callback
     */
    getDaySchedule (date, cb) {
        var self = this;

        var start = moment(date).startOf('day').format('x');
        var end = moment(date).endOf('day').format('x');
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
        self._getFromCollectionSorted(util.COLLECTION_TYPE.EVENTS, params, {
            time: 1
        }, cb);
    }

    /**
     * Get the next upcoming reminder and clear past reminders
     * @param cb Callback
     */
    getNextReminder (cb) {
        var self = this;

        //  First remove any viewed reminders
        self._removeFromCollection(util.COLLECTION_TYPE.REMINDER_QUEUE, {
            viewed: true
        }, removeOptions, function (err) {
            if (err) {
                cb(err);
            } else {
                //  Get all reminders and sort
                self._getFromCollectionSorted(
                    util.COLLECTION_TYPE.REMINDER_QUEUE,
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
     * Set the viewed flag of the reminder to true
     * @param id Reminder ID
     * @param cb Callback
     */
    setReminderViewed (id, cb) {
        var self = this;

        //  Verify the ID is legit
        self._getFromCollection(util.COLLECTION_TYPE.REMINDER_QUEUE, {
            _id: id
        }, function (err, docs) {
            if (err || docs.length === 0) {
                cb(err || errors.INVALID_DOC_ID);
            } else {
                //  Update the flag
                self._updateInCollection(util.COLLECTION_TYPE.REMINDER_QUEUE, {
                    _id: id
                }, {
                    $set: {
                        viewed: true
                    }
                }, updateOptions, cb);
            }
        });
    }

    /**
     * Get the next upcoming event that matches the params
     * @param type EVENT_TYPE
     * @param params Params to match against
     * @param cb Callback
     */
    getNextMatchingEvent (type, params, cb) {
        var self = this;

        //  Get all events and sort
        if (type) {
            params.type = type;
        }
        self._getFromCollectionSorted(util.COLLECTION_TYPE.EVENTS, params, {
            time: 1
        }, function (err, docs) {
            cb(err, docs ? docs[0] : null);
        });
    }

    /**
     * Get docs from the specified collection that matches params
     * @param type COLLECTION_TYPE
     * @param params Params to match against
     * @param cb Callback
     */
    getMatchingCollectionDocs (type, params, cb) {
        var self = this;

        if (!self._db[type]) {
            //  Invalid collection
            cb(errors.INVALID_COLLECTION);
        } else {
            //  Process custom params and fetch
            params = self._processCustomMatchingParams(params);
            self._getFromCollection(type, params, function (err, docs) {
                switch (type) {
                    case util.COLLECTION_TYPE.ENTERTAINMENT:
                        var random = Math.floor(Math.random() * docs.length);
                        cb(err, docs[random], docs.length);
                        break;
                    default:
                        cb(err, docs);
                        break;
                }
            });
        }
    }

    /**
     * Updates the matching events of the specified collection
     * @param type COLLECTION_TYPE
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
            cb(errors.INVALID_COLLECTION);
        } else {
            self._updateInCollection(type, params, update, updateOptions, cb);
        }
    }

    /**
     * Removes matching events from the specified collection
     * @param type COLLECTION_TYPE
     * @param params Params to match against
     * @param cb Callback
     */
    removeFromCollection (type, params, cb) {
        var self = this;

        //  Process custom params
        params = self._processCustomMatchingParams(params);

        if (!self._db[type]) {
            //  Invalid collection
            cb(errors.INVALID_COLLECTION);
        } else {
            self._removeFromCollection(type, params, removeOptions, cb);
        }
    }

    /**
     * Adds a new doc to the specified collection
     * @param type COLLECTION_TYPE
     * @param subtype Doc subtype
     * @param params Params of doc
     * @param cb Callback
     */
    addNewCollectionDoc (type, subtype, params, cb) {
        var self = this;

        var verifyCB = null;
        switch (type) {
            case util.COLLECTION_TYPE.EVENTS:
                verifyCB = function (err, params) {
                    if (err) {
                        cb(err);
                    } else {
                        var events = [];

                        //  Check for repeat info
                        if (params.repeatInfo) {
                            var repeatInfo = _.cloneDeep(params.repeatInfo);
                            delete params.repeatInfo;

                            //  Add all events leading up to end time
                            var currTime = moment(parseInt(params.time));
                            while (currTime.format('x') <= moment(parseInt(repeatInfo.endTime)).format('x')) {
                                //  Update time value and add to array
                                var newParams = _.cloneDeep(params);
                                newParams.time = currTime.format('x');
                                events.push(newParams);

                                //  Add time interval to currTime
                                currTime.add(repeatInfo.interval.value, timeModifiers[repeatInfo.interval.modifier]);
                            }
                        } else {
                            events.push(params);
                        }

                        self._addToCollection(type, events, cb);
                    }
                };
                break;

            case util.COLLECTION_TYPE.INVENTORY:
                //  Type must be supply or record
                if (subtype !== 'supply' && subtype !== 'record') {
                    cb(errors.INVALID_INVENTORY);
                    return;
                }

                verifyCB = function (err, params) {
                    if (err) {
                        cb(err);
                    } else {
                        //  All is good, add to collection
                        self._addToCollection(type, params, cb);
                    }
                };
                break;

            case util.COLLECTION_TYPE.REMINDER_QUEUE:
                verifyCB = function (err, params) {
                    if (err) {
                        cb(err);
                    } else {
                        //  Also make sure the _id of event exists
                        self._getFromCollection(params.type, {
                            _id: params.event._id
                        }, function (err, docs) {
                            if (err || docs.length === 0) {
                                cb(err || errors.BAD_DOC_ID);
                                return;
                            }
                            //  All is good, add to collection
                            self._addToCollection(type, params, cb);
                        });
                    }
                };
                break;

            case util.COLLECTION_TYPE.CREDS:
                //  Type must be email-login or update-password
                if (params.type !== 'email-login' && params.type !== 'update-password') {
                    cb(errors.INVALID_CREDENTIALS);
                    return;
                }

                verifyCB = function (err, params) {
                    if (err) {
                        cb(err);
                    } else {
                        //  Can only add update-password if doesn't exist
                        if (params.type === 'update-password') {
                            self._getFromCollection(util.COLLECTION_TYPE.CREDS, {
                                type: 'update-password'
                            }, function (err, docs) {
                                if (err) {
                                    cb(err);
                                } else if (docs.length > 0) {
                                    cb('Error: Can\'t add a second update-password doc');
                                } else {
                                    //  All is good, add to collection
                                    self._addToCollection(type, params, cb);
                                }
                            });
                        } else {
                            //  Ok to add email-login
                            self._addToCollection(type, params, cb);
                        }
                    }
                };
                break;

            //  These don't need special processing
            case util.COLLECTION_TYPE.PATIENT:
            case util.COLLECTION_TYPE.PEOPLE:
            case util.COLLECTION_TYPE.MEDIA:
            case util.COLLECTION_TYPE.ENTERTAINMENT:
            case util.COLLECTION_TYPE.VOICE:
            case util.COLLECTION_TYPE.EMAIL:
                verifyCB = function (err, params) {
                    if (err) {
                        cb(err);
                    } else {
                        //  All is good, add to collection
                        self._addToCollection(type, params, cb);
                    }
                };
                break;
        }

        self._verifyCollectionParams(type, subtype, params, verifyCB);
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
            cb(errors.INVALID_COLLECTION);
            return;
        } else if (!minCollectionKeys[collection][docType]) {
            cb(errors.INVALID_DOCTYPE);
            return;
        }
        var keys = minCollectionKeys[collection][docType];

        //  Verify all the things
        var paramsCheck = self._checkForKeys(params, keys);
        var repeatCheck = !keys.repeatInfo || self._checkForKeys(params.repeatInfo, minRepeatInfoKeys);
        var remindCheck = !keys.reminderInfo || self._checkForKeys(params.reminderInfo, minReminderInfoKeys);

        //  Validate any date params
        params = self._dateCheck(params);
        if (!params) {
            cb(errors.INVALID_DATE);
        } else if (!(paramsCheck && repeatCheck && remindCheck)) {
            cb(errors.KEY_MISSING);
        } else {
            cb(null, params);   //  Success
        }
    }

    /**
     * Check params for any date keys and validate
     * @param params Params containing date keys
     * @return modified params or null if invalid dates present
     */
    _dateCheck (params) {
        var self = this;

        //  Loop over each key
        var ret = Object.keys(params).every(function (key) {
            if (typeof params[key] === 'object') {
                //  Recurse
                self._dateCheck(params[key]);
            } else {
                //  Check if key is a date key
                var i = _.indexOf(dateKeys, key);
                if (i >= 0) {
                    //  Is date, make sure it's valid
                    var toMs = parseInt(params[key]);
                    if (!toMs || !moment(toMs).isValid()) {
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

        self._db[collection].insert(docs, function (err, docs) {
            if (!docs.length) {
                //  Convert to array
                docs = [docs];
            }
            cb(err, docs);
        });
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

    /**
     * Wipes everything good lord have mercy
     * @param cb Callback
     */
    _clearDatabase (cb) {
        var self = this;

        var funcs = [];
        Object.keys(self._db).forEach(function (collection) {
            funcs.push(function (cb) {
                self._clearCollection(collection, cb);
            });
        });

        async.parallel(funcs, cb);
    }
}

module.exports = Model;
