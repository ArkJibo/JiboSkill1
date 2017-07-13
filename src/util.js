'use strict';

var util = require('util');

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

util.apiAi = {
    accessToken: '794fe25c72d340588cee0ea161130566',
    url: 'https://api.api.ai/v1/query'
};

module.exports = util;
