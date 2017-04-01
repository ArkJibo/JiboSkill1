'use strict';

var fs = require('fs');

//  Use node-imap to receive emails
var Imap = require('imap');

//  Use mailparser to parse emails
var MailParser = require('mailparser').MailParser;

// Use nodemailer to send emails
var NodeMailer = require('nodemailer');

var Q = require('q');
var jsonfile = require('jsonfile');
var eventObj = require('./event/event');

/**
* Get imap based from file
* @param cb Callback
*/
function getFreshImap (cb) {
    //  Get email creds from email.json
    fs.readFile('./email.json', 'utf8', function (err, data) {
        if (err) {
            cb(err);
        } else {
            try {
                var creds = JSON.parse(data);   // Can throw exception
                var hosts = {
                    'gmail.com': 'imap.gmail.com',
                    'yahoo.com': 'smtp.yahoo.com'
                };

                //  Get the host for the email address
                var host = null;
                Object.keys(hosts).forEach(function (h) {
                    if (creds.email.includes(h)) {
                        host = hosts[h];
                    }
                });
                if (host === null) {
                    cb('We\'re sorry, currently only Gmail and Yahoo accounts are supported');
                    return;
                }

                var imap = new Imap({   //  Can throw exception
                    user: creds.email,
                    password: creds.password,
                    host: host,
                    port: 993,
                    tls: true,
                    keepalive: true
                });

                var email = creds.email;

                //construct config necessary to send email
                var smtpConfig = {
                    service: 'Gmail',
                    auth:{
                        user: creds.email,
                        pass: creds.password
                    }
                };

                cb(null, imap, email, smtpConfig);
            } catch (e) {
                cb(e);
            }
        }
    });
}

class EmailClient {
    /**
    * Constructor for EmailClient
    * @param name = string value of user's full name
        eventBus = event object
    */
    constructor (name, eventBus) {
        var self = this;
        self._name = name;
        self._email = '';
        self._imap = Q.defer();
        self._transporter = Q.defer();
        self._status = Q.defer();
        self._SendCheck = Q.defer();
        self._changeCheck = Q.defer();
        self._eventBus = eventBus;

        //added an event listener for sending email
        self._eventBus.addEventListener(eventObj.SEND_EMAIL, this , function (res) {
            self._sendEmail(res.fromName, res.fromEmail, res.subject, res.body, res.attachments);
        });

        getFreshImap(function (err, imap, email, smtpConfig) {
            if (err) {
                console.log(err);
            } else {
                self._imap.resolve(imap);
                self._email = email;
                self._transporter.resolve(NodeMailer.createTransport(smtpConfig));
            }
        });
    }

    //function to get imap promise so we can wait for imap to complete initialization
    _loadInfo () {
    //  Get Imap obj and check emails
        var self = this;
        return self._imap.promise;
    }
    //function to get transporter promise so we can wait for transporter to complete initialization
    _loadTransporter () {
        var self = this;
        return self._transporter.promise;
    }
    //function to get status promise to get the status of email
    _loadStatus () {
        var self = this;
        return self._status.promise;
    }
    //function to get sendcheck promise to know when the email is sent
    _loadSendCheck () {
        var self = this;
        return self._SendCheck.promise;
    }
    //function to get changeCheck promise to know when email is changed successfully
    _loadChangeCheck () {
        var self = this;
        return self._changeCheck.promise;
    }

    //function to change Name
    _changeName (name) {
        var self = this;
        self._name = name;
    }
    //function to change email
    _changeEmail (email, password) {
        var self = this;
        self._imap = Q.defer();
        self._transporter = Q.defer();

        var obj = {
            'email': email,
            'password': password
        };

        jsonfile.writeFile('./email.json', obj, function (err) {
            if (err) {
                return;
            }

            getFreshImap(function (err, imap, email, smtpConfig) {
                if (err) {
                    console.log(err);
                } else {
                    self._imap.resolve(imap);
                    self._email = email;
                    self._changeCheck.resolve(true);
                    self._transporter.resolve(NodeMailer.createTransport(smtpConfig));
                }
            });
        });
    }

    //attachments as array of Path
    _sendEmail (toName, toEmail, subject, text, attachments) {
        var self = this;
        var fromText = {
            name: self._name,
            address: self._email
        };
        var toText = {
            name: toName,
            address: toEmail
        };

        var files = [];
        if (attachments) {
            for (var i = 0; i < attachments.length; i++) {
                files.push({
                    path: attachments[i]
                });
            }
        }

        //mail component
        var mailOptions = {
            from: fromText, // sender address
            to: toText, // list of receivers
            subject: subject, // Subject line
            text: text, // plaintext body
            attachments: files //attachments
        };

        // send mail with defined transport object
        self._loadTransporter().done(function (transporter) {
            self._transporter = transporter;
            // send mail with defined transport object
            self._transporter.sendMail(mailOptions, function (error) {
                if(error) {
                    return;
                }
                self._SendCheck.resolve(true);
            });
        });
    }

    _checkEmails () {
        var self = this;

        self._loadInfo().done(function (imap) {
            self._imap = imap;

            self._imap.on('ready', function () {
                self._imap.openBox('INBOX', false, function (err) {
                    if (err) {
                        throw err;
                    }
                    //  Parses all unseen emails
                    var collectUnseenEmails = function () {
                        self._imap.search(['UNSEEN'], function (err, results) {
                            if (err || results.length === 0) {
                                self._status.resolve('No new mail');
                                self._status = Q.defer();
                                return;
                            }
                            self._status.resolve('New mail');
                            //  Fetch the entire email bodies
                            var f = self._imap.fetch(results, {
                                bodies: [''],
                                markSeen: true //don't mark as seen until the user actually sees it
                            });

                            f.on('message', function (msg) {
                                var parser = new MailParser();
                                parser.on('end', function (mail) {

                                    var nameField = (mail.from[0].name).split(' ');
                                    var firstName = nameField[0];
                                    var lastName = nameField[1];
                                    var content = {
                                        time: mail.date,
                                        fromEmail: mail.from[0].address,
                                        fromFirstName: firstName,
                                        fromLastName: lastName,
                                        subject: mail.subject,
                                        body: mail.text

                                    };
                                    self._eventBus.emitEvent(eventObj.RECEIVED_EMAIL, content);

                                });
                                //  Write body data to parser
                                msg.on('body', function (stream) {
                                    stream.on('data', function (chunk) {
                                        parser.write(chunk.toString('utf8'));
                                    });
                                });

                                msg.once('end', function () {
                                    parser.end();
                                });
                            });
                        });
                    };
                    //  Collect existing unseen emails
                    collectUnseenEmails();
                    //  Listen for new mail coming in
                    self._imap.on('mail', function () {
                        collectUnseenEmails();
                    });
                });
            });

            self._imap.on('error', function () {
                self._imap.end();

                //  Get a new Imap to work with
                getFreshImap(function (err, imap) {
                    if (err) {
                        console.log(err);
                    } else {
                        self._imap = imap;

                        //  Try again in 10 sec
                        setTimeout(function () {
                            self._imap.connect();
                        }, 10000);
                    }
                });
            });
            self._imap.connect();
        });
    }
}
module.exports = EmailClient;
