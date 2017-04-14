'use strict';

var TestClient = require('./test-client');

class MainListener {

    constructor (blackboard, notepad) {
        var self = this;
        self.notepad = notepad;
        self.blackboard = blackboard;
    }

    /**
     * @param asrResult Contains the result of the voice interpretation
     * @param cb Callback
     */
    process (asrResult, cb) {
        var self = this;

        //  Get the variables set by main.rule
        switch (asrResult.action) {
            case 'testing':
                //  Call listener for handling testing
                var testClient = new TestClient();
                testClient.runTest(asrResult);
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
                var ScheduleListener = require('./schedule');
                var scheduleListener = new ScheduleListener(self.blackboard, self.notepad);
                scheduleListener.process(asrResult, cb);
                break;
        }
    }
}

module.exports = MainListener;
