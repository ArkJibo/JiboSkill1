'use strict';

var Listener = require('./listener');
var TestClient = require('./test-client');
var ScheduleListener = require('./schedule');
var EventDetailsListener = require('./event-details');

class MainListener extends Listener {

    constructor (blackboard, notepad) {
        super(blackboard, notepad);
    }

    /**
     * @param nlparse Contains the result of the voice interpretation
     * @param cb Callback
     */
    process (nlparse, cb) {
        var self = this;

        if (nlparse.status === 'NO-PARSE') {
            cb();
            return;
        }

        //  Get the variables set by main.rule
        switch (nlparse.action) {
            case 'testing':
                //  Call listener for handling testing
                var testClient = new TestClient();
                testClient.runTest(nlparse);
                testClient.getTestName().done(
                    function (name) {
                        if (name.status) {
                            testClient.getTestResult().done(
                                function (testResult) {
                                    //  Post testResult to notepad
                                    self.notepad.addItem({
                                        name: 'testResult',
                                        item: testResult
                                    });
                                    testClient.resetPromise();
                                    cb();
                                }
                            );
                        }
                    }
                );
                break;

            case 'schedule':
                var scheduleListener = new ScheduleListener(self.blackboard, self.notepad);
                scheduleListener.process(nlparse, cb);
                break;

            case 'event-details':
                var evtDetailsListener = new EventDetailsListener(self.blackboard, self.notepad);
                evtDetailsListener.process(nlparse, cb);
                break;
        }
    }
}

module.exports = MainListener;
