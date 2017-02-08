'use strict';

var util = require('util');

util.JIBO_EVENT_TYPE = {
    'APPOINTMENT': 'appointment',
    'MEDICATION': 'medication',
    'EXERCISE': 'exercise',
    'EATING': 'stock',
    'SHOPPING': 'shopping',
    'BILL': 'bill'
};

util.JIBO_COLLECTION_TYPE = {
    'EVENTS': 'events',
    'REMINDER_QUEUE': 'reminderQueue',
    'INVENTORY': 'inventory',
    'PATIENT': 'patient',
    'PEOPLE': 'people',
    'MEDIA': 'media',
    'ENTERTAINMENT': 'entertainment',
    'VOICE': 'voice'
};

module.exports = util;
