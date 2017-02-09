'use strict';

var fs = require('fs');
var path = require('path');

//  Use node-imap to receive emails
var Imap = require('imap');
var inspect = require('../util').inspect;

//  Use mailparser to parse emails
var MailParser = require('mailparser').MailParser;

// Use nodemailer to send emails 
var NodeMailer = require('nodemailer');

var Q = require('q');
var jsonfile = require('jsonfile');

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
    constructor (name, eventBus) {
        var self = this;
        self._name = name; 
        self._email = "";
        self._imap = Q.defer();
        self._transporter = Q.defer();
        self._status = Q.defer();
        self._SendCheck = Q.defer();
        self._changeCheck = Q.defer();
        self._eventBus = eventBus;
       
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

    _loadInfo(){
        //  Get Imap obj and check emails
        var self = this;
        return self._imap.promise;
    }

    _loadTransporter(){
        var self = this; 
        return self._transporter.promise;
    }

    _loadStatus(){
        var self = this;
        return self._status.promise;
    }

    _loadSendCheck(){
        var self = this;
        return self._SendCheck.promise;
    }

    _loadChangeCheck(){
        var self = this;
        return self._changeCheck.promise;
    }

    //method to change name of user
    _changeName(name){
        var self = this;
        self._name = name;
    }

    _changeEmail(email, password){
        var self = this;
        //self._email = email;

        self._imap = Q.defer();
        self._transporter = Q.defer();

        var obj = {
          "email": email,
          "password": password
        };

        jsonfile.writeFile("./email.json", obj, function (err) {
            if (err){
                console.log(err);
                return;
            }
            console.log("email.json was updated!");

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
    _sendEmail(toName, toEmail, subject, text, attachments){
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
        if (attachments !== null){
            for (var i = 0; i < attachments.length; i++){
                
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
        }

        // send mail with defined transport object
        self._loadTransporter().done(function (transporter){
            self._transporter = transporter;

            // send mail with defined transport object
            self._transporter.sendMail(mailOptions, function(error, info){
                if(error){
                    console.log(error);
                    return;
                }
                self._SendCheck.resolve(true);
                console.log('Message sent: ' + info.response);

                var content = {
                    fromEmail: fromText.address,
                    fromName: fromText.name,
                    subject: subject,
                    body: text
                };
                self._eventBus.emitEvent("SEND_EMAIL", content);
            });
        });
        
    }

    _checkEmails () {
        var self = this;

        self._loadInfo().done(function (imap){
            self._imap = imap;

            self._imap.on('ready', function () {
                self._imap.openBox('INBOX', false, function (err, box) {
                    if (err) {
                        throw err;
                    }
                    //  Parses all unseen emails
                    var collectUnseenEmails = function () {
                        self._imap.search(['UNSEEN'], function (err, results) {
                            if (err || results.length === 0) {
                                console.log(err || 'NO NEW MAIL');
                                self._status.resolve("No new mail");
                                self._status = Q.defer();
                                return;
                            }
                            self._status.resolve("New mail");
                            //  Fetch the entire email bodies
                            var f = self._imap.fetch(results, {
                                bodies: [''],
                                markSeen: false //don't mark as seen until the user actually sees it 
                            });

                            f.on('message', function (msg, seqno) {
                                var parser = new MailParser();
                                parser.on('end', function (mail) {
                                    //  Done parsing
                                    //  TODO: logic for sending event to event bus goes here
                                    console.log('NEW MAIL!');
                                    console.log(
                                        'From: ' + mail.from[0].address + '\n' +
                                        'Name: ' + mail.from[0].name + '\n' + 
                                        'Subject: ' + mail.subject + '\n' +
                                        'Body:' + mail.text
                                    );
                                    
                                    var content = {
                                        fromEmail: mail.from[0].address,
                                        fromName: mail.from[0].name,
                                        subject: mail.subject,
                                        body: mail.text
                                    };
                                    self._eventBus.emitEvent("RECEIVED_EMAIL", content);
                                    
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
                    self._imap.on('mail', function (newMsgs) {
                        collectUnseenEmails();
                    });
                });
            });

            self._imap.on('error', function (err) {
                console.log(err);
                console.log('Trying again in 10 seconds...');
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
