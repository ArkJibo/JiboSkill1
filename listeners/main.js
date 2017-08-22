'use strict';

var _ = require('lodash');
var Listener = require('./listener');
var TestClient = require('./test-client');
var ScheduleListener = require('./schedule');
var EventDetailsListener = require('./event-details');
var config = require('../config/default');
var util = require('../src/util');
var events = require('../src/core/event/event');

class MainListener extends Listener {

    constructor (blackboard, notepad) {
        super(blackboard, notepad);
    }

    /**
     * @param asrResult Contains the result of the voice interpretation
     * @param cb Callback
     */
    process (asrResult, cb) {
        var self = this;

        if (config.useNLP) {
            //  Let Jeeves parse the input
            self.blackboard.eventBus.emitEvent(events.ASK_JEEVES, {
                text: asrResult.Input
            }, function (err, json) {
                if (err) {
                    cb(err);
                    return;
                }

                //  Parse intent and params
                var res = JSON.parse(json);
                console.log(res);
                var intent = util.intents[res.result.action];
                if (intent) {
                    //  Make sure we got all required params
                    var resultParams = res.result.parameters;
                    var missingParams = _.difference(intent.required, Object.keys(resultParams));
                    if (missingParams.length === 0) {
                        //  Now handle any events that need to be emitted
                        if (intent.event) {
                            self.blackboard.eventBus.emitEvent(intent.event, resultParams, function (err, data) {
                                self.notepad.addFetchResult(intent.event, err, data);
                                self.notepad.addItem({
                                    name: 'listenTimeWhile',
                                    item: false
                                });
                                cb(null, res.result.action);
                            });
                        } else {
                            //  Handle intents with no events
                            cb('Currently no support for the intent ' + res.result.action);
                        }
                    } else {
                        cb('Missing params: ' + missingParams);
                    }
                } else {
                    cb('Unknown intent: ' + res.result.action);
                }
            });
        } else {
            if (asrResult.NLParse.status === 'NO-PARSE') {
                cb(asrResult.NLParse.status);
                return;
            }

            //  Get the variables set by main.rule
            switch (asrResult.NLParse.action) {
                case 'testing':
                    //  Call listener for handling testing
                    var testClient = new TestClient();
                    testClient.runTest(asrResult.NLParse);
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
                    scheduleListener.process(asrResult.NLParse, cb);
                    break;

                case 'event-details':
                    var evtDetailsListener = new EventDetailsListener(self.blackboard, self.notepad);
                    evtDetailsListener.process(asrResult.NLParse, cb);
                    break;
            }
        }
    }
}

module.exports = MainListener;
