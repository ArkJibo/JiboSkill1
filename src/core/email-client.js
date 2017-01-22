'use strict';

var fs = require('fs');

//  Use node-imap to receive emails
var Imap = require('imap');
var inspect = require('./util').inspect;

//  Use mailparser to parse emails
var MailParser = require('mailparser').MailParser;

// Use nodemailer to send emails 
var NodeMailer = require('nodemailer');

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

                var email = creds.email;

                //construct config necessary to send email 
                var smtpConfig = { 
                    service: "Gmail",
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
    //constructor takes the full name of user as String
    constructor (name) {
        var self = this;
        self.name = name; 

        //  Get Imap obj and check emails
        getFreshImap(function (err, imap, email, smtpConfig) {
            if (err) {
                console.log(err);
            } else {
                self.imap = imap;
                self.email = email;
                self.transporter = NodeMailer.createTransport(smtpConfig);
                self._checkEmails();  
            }
        });
    }

    _sendEmail(toName, toEmail, subject, text){
        var self = this;

        var fromText =  '"' + self.name + '" <' + self.email + '>'; 
        var toText = '"' + toName + '" <' + toEmail + '>'; 

        //mail component
        var mailOptions = {
            from: fromText, // sender address
            to: toText, // list of receivers
            subject: subject, // Subject line
            text: text // plaintext body
            //html: '<b>Hello world ?</b>' // html body
        }

        // send mail with defined transport object
        self.transporter.sendMail(mailOptions, function(error, info){
            if(error){
                return console.log(error);
            }
            console.log('Message sent: ' + info.response);
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
