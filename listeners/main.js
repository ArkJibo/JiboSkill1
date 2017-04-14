'use strict';

var TestClient = require('./test-client');

class MainListener {

    constructor () {}

    process (asrResult) {
        //  Get the variables set by main.rule
        var params = asrResult.NLParse;
        switch (params.action) {
            case 'testing':
                //  Call listener for handling testing
                var testClient = new TestClient();
                testClient.runTest(asrResult);
                testClient.getTestName().done(
                    function (name) {
                        if (name.status) {
                            testClient.getTestResult().done(
                                function () {
                                    //  Post testResult to notepad

                                    testClient.resetPromise();
                                }
                            );
                        }
                    }
                );

                break;
        }
    }
}

module.exports = MainListener;
