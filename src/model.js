'use strict';

var NeDB = require('nedb');

class Model {
    constructor () {
        var self = this;

        //  Initialize collections
        self._collections = {};
        self._collections.bill = new NeDB({filename: '../db/bill.json'});
        self._collections.entertainment = new NeDB({filename: '../db/entertainment.json'});
        self._collections.exercise = new NeDB({filename: '../db/exercise.json'});
        self._collections.media = new NeDB({filename: '../db/media.json'});
        self._collections.medication = new NeDB({filename: '../db/medication.json'});
        self._collections.patient = new NeDB({filename: '../db/patient.json'});
        self._collections.people = new NeDB({filename: '../db/people.json'});
        self._collections.reminderInfo = new NeDB({filename: '../db/reminderInfo.json'});
        self._collections.reminderQueue = new NeDB({filename: '../db/reminderQueue.json'});
        self._collections.repeatInfo = new NeDB({filename: '../db/repeatInfo.json'});
        self._collections.shopping = new NeDB({filename: '../db/shopping.json'});
        self._collections.stock = new NeDB({filename: '../db/stock.json'});
        self._collections.voice = new NeDB({filename: '../db/voice.json'});
    }

    ready () {
        console.log('Model ready!');
    }
};

module.exports = Model;
