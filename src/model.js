'use strict';

var Datastore = require('nedb');

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
        self._db.reminderInfo = new Datastore('./db/reminderInfo.db');
        self._db.reminderQueue = new Datastore('./db/reminderQueue.db');
        self._db.repeatInfo = new Datastore('./db/repeatInfo.db');
        self._db.shopping = new Datastore('./db/shopping.db');
        self._db.stock = new Datastore('./db/stock.db');
        self._db.voice = new Datastore('./db/voice.db');

        Object.keys(self._db).forEach(collection => {
            self._db[collection].loadDatabase();
        });
    }

    /*****************************************************************************************************************/

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

        var finalUpdate = {};
        if (updates.doc) {
            //  Can provide entire doc to replace
            finalUpdate = updates.doc;
        } else {
            //  Or pass specific ops to perform on the matches
            Object.keys(updates).forEach(function (key, i) {
                switch (key) {
                    case 'set':
                        finalUpdate['$set'] = updates.set;
                        break;
                    case 'increment':
                        finalUpdate['$inc'] = updates.increment;
                        break;
                }
            });
        }

        //  Do the update
        self._db[collection].update(
            params,
            finalUpdate, {
                multi: true,
                returnUpdatedDocs: updates.returnUpdated || false,
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
