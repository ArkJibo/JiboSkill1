'use strict';

var moment = require('moment');

var dayStart = moment().startOf('day');

module.exports = [{ //  EVENTS TODAY
    type: 'appointment',
    subtype: 'dentist',
    people: ['Dr. Doctor'],
    location: 'Dr. Doctor\'s Doctor Place',
    time: moment(dayStart).add(12, 'hours').format('x'),
    reminderInfo: {
        numReminders: 4,
        interval: {
            value: 1,
            modifier: 'h'
        },
        startTime: moment(dayStart).add(8, 'hours').format('x')
    },
    repeatInfo: {
        interval: {
            value: 6,
            modifier: 'm'
        },
        endTime: moment(dayStart).add(2, 'years').format('x')
    }
}, {
    type: 'medication',
    subtype: 'advil',
    time: moment(dayStart).add(16, 'hours').format('x'),
    reminderInfo: {
        numReminders: 6,
        interval: {
            value: 30,
            modifier: 'mm'
        },
        startTime: moment(dayStart).add(13, 'hours').format('x')
    },
    repeatInfo: {
        interval: {
            value: 1,
            modifier: 'd'
        },
        endTime: moment(dayStart).add(1, 'year').format('x')
    }
}, {
    type: 'meal',
    subtype: 'breakfast',
    time: moment(dayStart).add(10, 'hours').format('x'),
    reminderInfo: {
        numReminders: 3,
        interval: {
            value: 20,
            modifier: 'mm'
        },
        startTime: moment(dayStart).add(9, 'hours').format('x')
    },
    repeatInfo: {
        interval: {
            value: 1,
            modifier: 'd'
        },
        endTime: moment(dayStart).add(25, 'years').format('x')
    }
}, {
    type: 'exercise',
    subtype: 'walking',
    time: moment(dayStart).add(15, 'hours').format('x'),
    location: 'park',
    reminderInfo: {
        numReminders: 3,
        interval: {
            value: 15,
            modifier: 'mm'
        },
        startTime: moment(dayStart).add(14, 'hours').format('x')
    },
    repeatInfo: {
        interval: {
            value: 12,
            modifier: 'h'
        },
        endTime: moment(dayStart).add(6, 'months').format('x')
    }
}, {    //  EVENTS IN THE FUTURE
    type: 'shopping',
    subtype: 'groceries',
    people: ['Sarah'],
    location: 'Target',
    time: moment(dayStart).add(36, 'hours').format('x'),
    toBring: ['umbrella', 'wallet'],
    toPurchase: ['apples', 'juice', 'broccoli'],
    reminderInfo: {
        numReminders: 2,
        interval: {
            value: 30,
            modifier: 'mm'
        },
        startTime: moment(dayStart).add(34, 'hours').add(50, 'minutes').format('x')
    }
}, {
    type: 'bill',
    subtype: 'electricity',
    time: moment(dayStart).add(2, 'days').add(12, 'hours').format('x'),
    value: 2.15,
    reminderInfo: {
        numReminders: 3,
        interval: {
            value: 20,
            modifier: 'mm'
        },
        startTime: moment(dayStart).add(2, 'days').add(11, 'hours').format('x')
    },
    repeatInfo: {
        interval: {
            value: 3,
            modifier: 'm'
        },
        endTime: moment(dayStart).add(2, 'days').add(12, 'hours').add(5, 'years').format('x')
    }
}, {    //  EVENTS IN THE PAST
    type: 'social',
    subtype: 'birthday party',
    time: moment(dayStart).subtract(1, 'week').format('x'),
    people: ['John', 'Chad', 'Allie', 'Phil', 'Chelsey'],
    location: 'Chad\'s house',
    toBring: ['the present'],
    reminderInfo: {
        numReminders: 4,
        interval: {
            value: 5,
            modifier: 'mm'
        },
        startTime: moment(dayStart).subtract(1, 'week').subtract(30, 'minutes').format('x')
    },
    repeatInfo: {
        interval: {
            value: 1,
            modifier: 'y'
        },
        endTime: moment(dayStart).subtract(1, 'week').add(30, 'years').format('x')
    }
}];
