'use strict';

var util = require('util');
var events = require('./core/event/event');

util.EMAIL_DB_UPDATE_TAG = 'JIBO DATABASE UPDATE';

util.EVENT_TYPE = {
    APPOINTMENT: 'appointment',
    MEDICATION: 'medication',
    EXERCISE: 'exercise',
    MEAL: 'meal',
    SHOPPING: 'shopping',
    BILL: 'bill',
    SOCIAL: 'social'
};

util.COLLECTION_TYPE = {
    EVENTS: 'events',
    REMINDER_QUEUE: 'reminderQueue',
    INVENTORY: 'inventory',
    PATIENT: 'patient',
    PEOPLE: 'people',
    MEDIA: 'media',
    ENTERTAINMENT: 'entertainment',
    VOICE: 'voice',
    CREDS: 'credentials',
    EMAIL: 'emails'
};

util.MEM_STIMULANT = {
    MEDIA: 'media',
    TRIVIA: 'trivia'
};

util.intents = {
    'calendar.getSchedule': {
        parameters: ['date'],
        required: ['date'],
        event: events.FETCH_SCHEDULE
    },
    'calendar.getEventDetails': {
        parameters: ['type', 'subtype', 'people', 'location', 'time'],
        required: [],
        event: events.DATABASE_FETCH
    },
    'calendar.addEvent': {
        parameters: ['type', 'subtype', 'people', 'location', 'time', 'value', 'toBring', 'lastTaken',
            'toPurchase', 'details'],
        required: ['type', 'subtype', 'time'],
        event: events.DATABASE_ADD
    },
    'test.run': {
        parameters: ['type'],    //  unit, functional, or all
        required: ['type'],
        event: null
    },
    'misc.unknown': {
        parameters: ['statement'],  //  statement that was not understood
        required: ['statement'],
        event: null
    }
};

module.exports = util;
