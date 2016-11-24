'use strict';

var Enum = require('enum');

var EVENT_TYPE = new Enum([
    { 'APPOINTMENT': 'appointment' },
    { 'MEDICATION': 'medication' },
    { 'EXERCISE': 'exercise' },
    { 'EATING': 'stock' },
    { 'SHOPPING': 'shopping' },
    { 'BILL': 'bill' }
]);
