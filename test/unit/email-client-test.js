/* global describe, it, before */

'use strict';

var expect = require('chai').expect;
var emailClient = require('../../src/core/email-client');
var eventBus = require('../../src/core/event/event-bus');
var eventObj = require('../../src/core/event/event');

describe('Email Client test:', function () {
    var email_Client;
    var event_Bus;

    before(function () {
        //Instantiate email Client class
        event_Bus = new eventBus();
        email_Client = new emailClient('Roy Kim', event_Bus);
    });

    describe('Email functionality:', function () {

        it('Should pass with no new mails', function (done) {
            //intiating checking email client
            email_Client._checkEmails();
            //loadstatus make sure that there is a reponse from server before we check
            email_Client._loadStatus().done(function (status) {
                //there should be no new email
                expect(status).to.equal('No new mail');
                //indicating that the test is done
                done();
            });
        });

        it('Should send an email and pass with new email', function (done) {
            //send email to ourself
            var listenCheck = false;
            //start listen event bus
            event_Bus.addEventListener(eventObj.RECEIVED_EMAIL, email_Client , function (res) {
                //check the content
                expect(res.fromEmail).to.equal('kimr07175@gmail.com');
                expect(res.fromFirstName).to.equal('Roy');
                expect(res.fromLastName).to.equal('Kim');
                expect(res.subject).to.equal('Hi');
                expect(res.body).to.equal('Hello\n');
                expect(res.time).to.not.equal(null);
                listenCheck = true;
            });
            var content = {
                fromEmail: 'kimr07175@gmail.com',
                fromName: 'Ben Lee',
                subject: 'Hi',
                body: 'Hello',
                attachments: null
            };
            event_Bus.emitEvent(eventObj.SEND_EMAIL, content);

            //loadsendcheck make sure the email was sent before we check whether we received it
            email_Client._loadSendCheck().done(function () {
                setTimeout(function () {
                    //there should be new email
                    email_Client._loadStatus().done(function (status) {
                        //there should be no new email
                        expect(status).to.equal('New mail');
                        expect(listenCheck).to.equal(true);
                        //indicating that the test is done
                        done();
                    });
                }, 5000);
            });
        });
    });


    describe('Modify Email Client Variables:', function () {
        it('Should change username', function () {
            //changing username
            email_Client._changeName('Ben10');
            expect(email_Client._name).to.equal('Ben10');
        });

        it('Should change email and password', function (done) {
            email_Client._changeEmail('kimr07175@gmail.com', 'Benji-1717');
            //loadchangecheck make sure new email info is updated on json file
            email_Client._loadChangeCheck().done(function (changeCheck) {
                //changechek is bool variable that is true when it is changed
                expect(changeCheck).to.equal(true);
                //check new email
                expect(email_Client._email).to.equal('kimr07175@gmail.com');
                //send using this new email info to make sure it is changed successfully
                email_Client._sendEmail('Ben Lee', 'eagle2417@gmail.com', 'Hi', 'Hello', null);
                email_Client._loadSendCheck().done(function (check) {
                    //email should be send successfully
                    expect(check).to.equal(true);
                    done();
                });
            });
        });
    });
});
