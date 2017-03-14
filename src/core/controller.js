'use strict';

var Model = require('../model');
var EmailClient = require('./email-client');
var BookKeeper = require('./book-keeper');
var events = require('./event/event');
var errors = require('../errors');
var util = require('../util');
var _ = require('lodash');
var config = require('config');
var async = require('async');

class Controller {

    /**
     * @param eventBus Event Bus used throughout application
     */
    constructor (eventBus) {
        var self = this;

        //  DB files differ based on NODE_ENV
        var db = config.get('model.db');

        self._eventBus = eventBus;
        self._model = new Model(db);
        self._emailClient = new EmailClient('BIG FAKE NAME', eventBus);
        self._bookkeeper = new BookKeeper();

        //  Register event listeners
        self._eventBus.addEventListener(events.RECEIVED_EMAIL, self, self._receivedEmail);
        self._eventBus.addEventListener(events.FETCH_SCHEDULE, self, self._fetchSchedule);
        self._eventBus.addEventListener(events.STIMULATE_MEMORY, self, self._stimulateMemory);
        self._eventBus.addEventListener(events.FETCH_NEXT_REMINDER, self, self._fetchNextReminder);
        self._eventBus.addEventListener(events.FILL_REMINDER_QUEUE, self, self._fillReminderQueue);
        self._eventBus.addEventListener(events.FLAG_REMINDER, self, self._flagReminder);
        self._eventBus.addEventListener(events.UNKNOWN_USER_INPUT, self, self._unknownUserInput);
        self._eventBus.addEventListener(events.DATABASE_FETCH, self, self._fetchFromDatabase);
        self._eventBus.addEventListener(events.DATABASE_UPDATE, self, self._updateDatabase);
        self._eventBus.addEventListener(events.DATABASE_ADD, self, self._addToDatabase);
        self._eventBus.addEventListener(events.DATABASE_REMOVE, self, self._removeFromDatabase);
    }

    /**
     * Listener for RECEIVED_EMAIL event
     * @param params Params of the email received
     * @param cb Callback
     */
    _receivedEmail (params, cb) {
        var self = this;

        var sendEmail = function (params) {
            self._eventBus.emitEvent(events.SEND_EMAIL, {
                to: params.to,
                subject: params.subject,
                body: params.body,
                attachments: null
            });
        };

        //  Validate
        if (!params || !params.fromEmail) {
            cb('Invalid params passed with RECEIVED_EMAIL');
            return;
        }

        //  Determine if email is a special update email
        var regex = new RegExp('^\\[' + util.EMAIL_DB_UPDATE_TAG + '\\].*', 'g');
        var ret = regex.exec(params.subject);
        if (ret) {
            var fullTag = '[' + util.EMAIL_DB_UPDATE_TAG + ']';
            var updateName = params.subject.substring(params.subject.indexOf(fullTag) + fullTag.length).trim();

            //  Convert email to JSON
            var body = {};
            try {
                var json = JSON.parse(params.body);

                //  Convert keys to lower case
                Object.keys(json).forEach(function (key) {
                    body[key.toLowerCase()] = _.cloneDeep(json[key]);
                    if (key.toLowerCase() === 'modify') {
                        Object.keys(json[key]).forEach(function (key2) {
                            delete body[key.toLowerCase()][key2];
                            body[key.toLowerCase()][key2.toLowerCase()] = _.cloneDeep(json[key][key2]);
                        });
                    }
                });
            } catch (e) {
                //  Emit event to respond to email with error
                sendEmail({
                    to: params.fromEmail,
                    subject: '[JIBO DATABASE UPDATE FAILURE] For update "' + updateName + '"',
                    body: 'Error parsing email body: ' + e
                });
                cb('Error parsing email body: ' + e);
                return;
            }

            //  Authenticate request
            self._model.getMatchingCollectionDocs(util.COLLECTION_TYPE.CREDS, {
                type: 'update-password',
                password: body.password
            }, function (err, docs) {
                if (err) {
                    sendEmail({
                        to: params.fromEmail,
                        subject: '[JIBO DATABASE UPDATE FAILURE] For update "' + updateName + '"',
                        body: err
                    });
                    cb(err);
                } else if (docs.length === 0) {
                    sendEmail({
                        to: params.fromEmail,
                        subject: '[JIBO DATABASE UPDATE FAILURE] For update "' + updateName + '"',
                        body: 'Incorrect password'
                    });
                    cb('Incorrect password');
                } else {
                    var funcs = [];

                    //  Make database updates
                    Object.keys(body).forEach(function (key) {
                        if (key === 'password') {
                            return;
                        }

                        //  Convert to array to make processing easier
                        if (!body[key].length) {
                            body[key] = [body[key]];
                        }

                        body[key].forEach(function (doc) {
                            //  Delete _collection so it's not part of query
                            var _collection = doc._collection;
                            delete doc._collection;
                            if (!_collection) {
                                console.log('No _collection found in params');
                                return;
                            }

                            //  Push all of the add/remove/update funcs to run in parallel
                            switch (key) {
                                case 'add':
                                    var _docType = doc._docType;
                                    delete doc._docType;
                                    if (!_docType) {
                                        console.log('No _docType found in params');
                                        return;
                                    }

                                    funcs.push(function (cb) {
                                        self._model.addNewCollectionDoc(_collection, _docType, doc, function (err, docs) {
                                            cb(err, {
                                                add: docs
                                            });
                                        });
                                    });
                                    break;

                                case 'remove':
                                    funcs.push(function (cb) {
                                        self._model.removeFromCollection(_collection, doc, function (err, docs) {
                                            cb(err, {
                                                remove: docs
                                            });
                                        });
                                    });
                                    break;

                                case 'modify':
                                    funcs.push(function (cb) {
                                        self._model.updateCollection(_collection, doc.match, doc.changes, function (err, numAffected) {
                                            cb(err, {
                                                modify: numAffected
                                            });
                                        });
                                    });
                                    break;
                            }
                        });
                    });

                    async.parallel(funcs, function (err, ret) {
                        //  Draft confirmation email
                        var subject = '[JIBO DATABASE UPDATE CONFIRMATION] For update "' + updateName + '"';
                        var body = '';

                        ret.forEach(function (r) {
                            //  Don't worry about _id
                            delete params._id;

                            if (r.add) {
                                body += '\nDocument added:\n';
                                body += JSON.stringify(r.add, null, 2) + '\n';
                            }
                            if (r.remove) {
                                body += '\n# documents removed: ' + r.remove + '\n';
                            }
                            if (r.modify) {
                                body += '\# documents modified: ' + r.modify + '\n';
                            }
                        });

                        //  Both emit event for return email and return docs through cb
                        sendEmail({
                            to: params.fromEmail,
                            subject: subject,
                            body: body
                        });
                        cb(err, ret);
                    });
                }
            });
        } else {
            //  If not, save email to database and fire event to front end
            self._model.addNewCollectionDoc(util.COLLECTION_TYPE.EMAIL, 'default', {
                fromEmail: params.fromEmail,
                fromFirstName: params.fromFirstName,
                fromLastName: params.fromLastName,
                subject: params.subject,
                body: params.body,
                date: params.date
            }, cb);
        }
    }

    /**
     * Fetch schedule for the day
     */
    _fetchSchedule () {
        var self = this;
        var cb = arguments[1];

        self._model.getTodaySchedule(cb);
    }

    /**
     * Fetch some memory stimulation about friends/family
     * @param params The type of stimulant to fetch
     * @param cb Callback
     */
    _stimulateMemory (params, cb) {
        var self = this;

        //  Check the type of stimulant they want
        switch (params.type) {
            case util.MEM_STIMULANT.MEDIA:
                self._model.getMatchingCollectionDocs(util.COLLECTION_TYPE.MEDIA, {
                    //  For now, just get either a photo or video
                    $or: [{
                        type: 'photo',
                    }, {
                        type: 'video'
                    }]
                }, function (err, docs) {
                    if (err) {
                        cb(err);
                    } else {
                        //  Sort in ascending order to return the least viewed item
                        docs = _.sortBy(docs, function (doc) {
                            return doc.timesViewed;
                        });
                        cb(null, docs.length > 0 ? docs[0] : null);
                    }
                });
                break;

            case util.MEM_STIMULANT.TRIVIA:
                //  Decide the question to ask
                var getTrivia = function (doc) {
                    var questions = ['first-name', 'last-name', 'relationship', 'birthday'];
                    var question = questions[Math.round(Math.random() * (questions.length - 1))];
                    var answer = '';

                    //  Phrase into a full question
                    switch (question) {
                        case 'first-name':
                            question = 'Do you remember your ' + doc.relationship + '\'s first name?';
                            answer = doc.first;
                            break;
                        case 'last-name':
                            question = 'Do you remember your ' + doc.relationship + '\'s last name?';
                            answer = doc.last;
                            break;
                        case 'relationship':
                            question = 'Do you remember your relationship with ' + doc.first + ' ' + doc.last + '?';
                            answer = doc.relationship;
                            break;
                        case 'birthday':
                            question = 'Do you remember ' + doc.first + ' ' + doc.last + '\'s birthday?';
                            answer = doc.birthday;
                            break;
                    }

                    return {
                        question: question,
                        answer: answer
                    };
                };

                //  Return a person doc for Jibo to ask trivia about
                self._model.getMatchingCollectionDocs(util.COLLECTION_TYPE.PEOPLE, {
                    _custom: [{
                        key: 'closeness',
                        op: 'gte',
                        value: 5
                    }]
                }, function (err, docs) {
                    if (err) {
                        cb(err);
                    } else if (docs.length === 0) {
                        //  Try again with no closeness filter
                        self._model.getMatchingCollectionDocs(util.COLLECTION_TYPE.PEOPLE, {}, function (err, docs) {
                            if (err) {
                                cb(err);
                            } else if (docs.length === 0) {
                                cb();
                            } else {
                                cb(null, getTrivia(docs[Math.round(Math.random() * (docs.length - 1))]));
                            }
                        });
                    } else {
                        cb(null, getTrivia(docs[Math.round(Math.random() * (docs.length - 1))]));
                    }
                });
                break;

            default:
                cb('Invalid stimulant type');
        }
    }

    /**
     * Fetch the next reminder in queue
     */
    _fetchNextReminder () {
        var self = this;
        var cb = arguments[1];

        self._model.getNextReminder(cb);
    }

    /**
     * Fill the reminder queue for the day's events
     */
    _fillReminderQueue () {
        var self = this;
        var cb = arguments[1];

        self._model.fillTodayReminderQueue(cb);
    }

    /**
     * Set reminder's viewed flag to true
     * @param params Params with reminder ID
     * @param cb Callback
     */
    _flagReminder (params, cb) {
        var self = this;

        self._model.setReminderViewed(params.id, cb);
    }

    /**
     * Handle case of user input not understood
     * @param params Params with input and date
     * @param cb Callback
     */
    _unknownUserInput (params, cb) {
        var self = this;

        //  Do something, like record metrics

        cb();
    }

    /**
     * Listener for request to fetch from specific collection in database
     * @param params Params of get request
     * @param cb Callback
     */
    _fetchFromDatabase (params, cb) {
        var self = this;

        self._model.getMatchingCollectionDocs(params.type, params.fetchParams, cb);
    }

    /**
     * Listen for update database events
     * @param params Params of update
     * @param cb Callback
     */
    _updateDatabase (params, cb) {
        var self = this;

        self._model.updateCollection(params.type, params.params, params.updates, cb);
    }

    /**
     * Listen for add to database events
     * @param params Params of doc to add
     * @param cb Callback
     */
    _addToDatabase (params, cb) {
        var self = this;

        self._model.addNewCollectionDoc(params.type, params.subtype, params.doc, cb);
    }

    /**
     * Listen for remove from database events
     * @param params Params to match against
     * @param cb Callback
     */
    _removeFromDatabase (params, cb) {
        var self = this;

        self._model.removeFromCollection(params.type, params.params, cb);
    }
}

module.exports = Controller;
