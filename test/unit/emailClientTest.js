/* global describe, it, before, beforeEach, after, afterEach */

'use strict';

var assert = require('assert');
var Datastore = require('nedb');
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var Model = require('../../src/model');
var Errors = require('../../src/errors');
var expect = require('chai').expect;
var util = require('../../src/util');
var emailClient = require('../../src/core/email-client');

describe("Email Client test", function() {
  describe("Sending email test", function() {
    it("Sends an email to one person", function() {
      
      var email_client = new emailClient("Roy Kim");
      email_client._sendEmail("Roy Kim", "kimr07175@gmail.com", "Hi", "Hello", null);

    });
  });

  
});

