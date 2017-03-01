'use strict';

var fs = require('fs');

//  Use node-imap to receive emails
var Imap = require('imap');
var inspect = require('../util').inspect;

//  Use mailparser to parse emails
var MailParser = require('mailparser').MailParser;

//  TODO: there's probably a better way to be error resilient than creating a new Imap
function getFreshImap (cb) {
    //  Get email creds from email.json
    fs.readFile('./email.json', 'utf8', function (err, data) {
        if (err) {
            cb(err);
        } else {
            try {
                var creds = JSON.parse(data);   //  Can throw exception
                var hosts = {
                    'gmail.com': 'imap.gmail.com',
                    'yahoo.com': 'smtp.yahoo.com' //  Need to verify this one
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

                cb(null, imap);
            } catch (e) {
                cb(e);
            }
        }
    });
}

class EmailClient {
    constructor () {
        var self = this;

        //  Get Imap obj and check emails
        getFreshImap(function (err, imap) {
            if (err) {
                console.log(err);
            } else {
                self.imap = imap;
                self._checkEmails();
            }
        });
    }

    _checkEmails () {
        var self = this;

        self.imap.on('ready', function () {
            self.imap.openBox('INBOX', false, function (err, box) {
                if (err) {
                    throw err;
                }

                //  Parses all unseen emails and marks them as read
                var collectUnseenEmails = function () {
                    self.imap.search(['UNSEEN'], function (err, results) {
                        if (err || results.length === 0) {
                            console.log(err || 'NO NEW MAIL');
                            return;
                        }

                        //  Fetch the entire email bodies
                        var f = self.imap.fetch(results, {
                            bodies: [''],
                            markSeen: true
                        });

                        f.on('message', function (msg, seqno) {
                            var parser = new MailParser();
                            parser.on('end', function (mail) {
                                //  Done parsing
                                //  TODO: logic for sending event to event bus goes here
                                console.log('NEW MAIL!');
                                console.log(
                                    'From: ' + mail.from[0].address + '\n' +
                                    'Subject: ' + mail.subject + '\n' +
                                    'Body:\n' + mail.text
                                );
                            });

                            //  Write body data to parser
                            msg.on('body', function (stream, info) {
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
                self.imap.on('mail', function (newMsgs) {
                    collectUnseenEmails();
                });
            });
        });

        self.imap.on('error', function (err) {
            console.log(err);
            console.log('Trying again in 10 seconds...');
            self.imap.end();

            //  Get a new Imap to work with
            getFreshImap(function (err, imap) {
                if (err) {
                    console.log(err);
                } else {
                    self.imap = imap;

                    //  Try again in 10 sec
                    setTimeout(function () {
                        self.imap.connect();
                    }, 10000);
                }
            });
        });

        self.imap.connect();
    }
}

module.exports = EmailClient;
