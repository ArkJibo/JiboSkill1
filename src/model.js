'use strict';

var Datastore = require('nedb');
var Util = require('./util');
var Errors = require('./errors');

var minRepeatInfoKeys = ['type', 'startTime', 'interval'];
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
    GetTodaySchedule (cb) {

    }

    /**
     * Add appointment
     * @param param Params of appt
     * @param cb Callback
     */
    addAppointment (params, cb) {
        var self = this;

        //  Verify correct params
        if (!self._verifyCollectionParams('appointment', params, true)) {
            cb(Errors.KEY_MISSING);
            return;
        }

        self._addToCollection('appointment', params, cb);
    }

    /**
     * Add medication
     * @param param Params of medication
     * @param cb Callback
     */
    addMedication (params, cb) {
        var self = this;

        //  Verify correct params
        if (!self._verifyCollectionParams('medication', params, true)) {
            cb(Errors.KEY_MISSING);
            return;
        }

        self._addToCollection('medication', params, cb);
    }

    /**
     * Add shopping doc
     * @param param Params of shopping
     * @param cb Callback
     */
    addShopping (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('shopping', params, true) &&
            !self._checkForKeys(params, ['date', 'itemsBought'])) {

            cb(Errors.KEY_MISSING);
            return;
        }
        if (params.itemsBought) {
            //  Make sure each array item has correct params
            for (var i = 0; i < params.itemsBought.length; i++) {
                if (!self._checkForKeys(params.itemsBought[i], ['name', 'amount'])) {
                    cb(Errors.KEY_MISSING);
                    return;
                }
            }
        }

        self._addToCollection('shopping', params, cb);
    }

    /**
     * Add info about current stock of household supplies
     * @param params Params of stock
     * @param cb Callback
     */
    addToStock (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('stock', params, false)) {
            cb(Errors.KEY_MISSING);
            return;
        }
        self._addToCollection('stock', params, cb);
    }

    /**
     * Add new bill
     * @param params Params of bill
     * @param cb Callback
     */
    addBill (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('bill', params, true)) {
            cb(Errors.KEY_MISSING);
            return;
        }
        self._addToCollection('bill', params, cb);
    }

    /**
     * Queue reminder
     * @param params Params of reminder
     * @param cb Callback
     */
    queueReminder (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('reminderQueue', params, false)) {
            cb(Errors.KEY_MISSING);
            return;
        }

        //  Also make sure the _id of event exists
        self._getFromCollection(params.type, {
            _id: params.event._id
        }, function (err, docs) {
            if (err || docs.length === 0) {
                cb(Errors.BAD_DOC_ID);
                return;
            }
            self._addToCollection('reminderQueue', params, cb);
        });
    }

    /**
     * Add more info about the patient
     * @param params Params about the new info
     * @param cb Callback
     */
    addPatientInfo (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('patient', params, false)) {
            cb(Errors.KEY_MISSING);
            return;
        }
        self._addToCollection('patient', params, cb);
    }

    /**
     * Add info about a person in the patient's life
     * @param params Params of the person
     * @param cb Callback
     */
    addPerson (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('people', params, false)) {
            cb(Errors.KEY_MISSING);
            return;
        }
        self._addToCollection('people', params, cb);
    }

    /**
     * Add new media relevant to the patient
     * @param params Params of media
     * @param cb Callback
     */
    addMedia (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('media', params, false)) {
            cb(Errors.KEY_MISSING);
            return;
        }
        self._addToCollection('media', params, cb);
    }

    /**
     * Add entertainment to randomly show to patient
     * @param params Params of entertainment
     * @param cb Callback
     */
    addEntertainment (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('entertainment', params, false)) {
            cb(Errors.KEY_MISSING);
            return;
        }
        self._addToCollection('entertainment', params, cb);
    }

    /**
     * Add a new voice line for interacting with patient
     * @param params Params of voice line
     * @param cb Callback
     */
    addVoiceLine (params, cb) {
        var self = this;

        if (!self._verifyCollectionParams('voice', params, false)) {
            cb(Errors.KEY_MISSING);
            return;
        }
        self._addToCollection('voice', params, cb);
    }

    /*  PRIVATE METHODS ******************************************************************************************/

    /**
     * Util function to verify minimum params of any collection type
     * @param collection The collection type
     * @param params Params to verify
     * @param repeatRemind True if should verify repeatInfo and reminderInfo keys
     */
    _verifyCollectionParams (collection, params, repeatRemind) {
        var self = this;

        var minKeys = {
            'appointment': ['type', 'people', 'time', 'repeatInfo', 'reminderInfo'],
            'medication': ['name', 'type', 'lastTaken', 'repeatInfo', 'reminderInfo'],
            'exercise': ['name', 'details', 'repeatInfo', 'reminderInfo'],
            'shopping': ['toPurchase', 'repeatInfo', 'reminderInfo'],
            'stock': ['type', 'name', 'amount'],
            'bill': ['type', 'amount', 'repeatInfo', 'reminderInfo'],
            'reminderQueue': ['type', 'event', 'time'],
            'patient': ['type', 'subType', 'value'],
            'people': ['first', 'last', 'relationship', 'closeness', 'birthday'],
            'media': ['type', 'occasion', 'file', 'timesViewed'],
            'entertainment': ['type', 'dateAdded', 'lastUsed', 'rating'],
            'voice': ['type', 'line', 'dateAdded']
        };

        var keys = minKeys[collection];
        if (keys === undefined) {
            return false;
        }

        if (repeatRemind) {
            return self._checkForKeys(params, keys) && self._checkForKeys(params.repeatInfo, minRepeatInfoKeys) &&
                self._checkForKeys(params.reminderInfo, minReminderInfoKeys);
        } else {
            return self._checkForKeys(params, keys);
        }
    }

    /**
     * Checks if the obj contains the keys
     * @param obj Object to check
     * @param keys Keys to look for
     */
    _checkForKeys (obj, keys) {
        var self = this;

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
