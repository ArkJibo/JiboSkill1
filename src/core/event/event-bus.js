'use strict';

var errors = require('../../errors');
var EventEmitter = require('events');

class EventBus extends EventEmitter {

    /*
     * @param jiboEmitter For sending events up to the global Jibo emitter
     */
    constructor (jiboEmitter) {
        super();
        this._jiboEmitter = jiboEmitter;
    }

    /**
     * Register a listener (function) to be triggered by the event
     * @param event String value of the event
     * @param context The object pointed to by the "this" keyword
     * @param listener The function to be called
     * @throws exception on bad args
     */
    addEventListener (event, context, listener) {
        var self = this;

        var ret = self._validateArgs(event, listener);
        if (ret) {
            throw ret;
        }

        self.on(event, listener.bind(context));
    }

    /**
     * Register a listener (function) to be triggered by the event ONCE
     * @param event String value of the event
     * @param context The object pointed to by the "this" keyword
     * @param listener The function to be called
     * @throws exception on bad args
     */
    addOnceEventListener (event, context, listener) {
        var self = this;

        var ret = self._validateArgs(event, listener);
        if (ret) {
            throw ret;
        }

        self.once(event, listener.bind(context));
    }

    /**
     * Deregister listener from the event
     * @param event String value of the event
     * @param listener The function to deregister
     * @throws exception on bad args
     */
    removeEventListener (event, listener) {
        var self = this;

        var ret = self._validateArgs(event, listener);
        if (ret) {
            throw ret;
        }

        self.removeListener(event, listener);
    }

    /**
     * Removes all event listeners, or those of an event
     * @param event String value of the event
     * @throws exception on bad args
     */
    clear (event) {
        var self = this;

        if (event) {
            if (typeof event !== 'string') {
                throw errors.BAD_EVENT;
            }
            self.removeAllListeners(event);
        } else {
            self.removeAllListeners(); // Passing event doesn't work if it's null/undefined
        }
    }

    /**
     * Fires the event with specified params
     * @param event String value of the event
     * @param params JS object with event params
     * @param cb Callback for returning data to caller
     */
    emitEvent (event, params, cb) {
        var self = this;
        self.emit(event, params, cb);
    }

    /**
     * Fires the event on the Jibo event emitter
     * @param event String value of the event
     * @param params JS object with event params
     */
    emitJiboEvent (event, params) {
        var self = this;
        self._jiboEmitter.emit(event, params);
    }

    /**
     * Helper for validating args
     * @param event
     * @param listener
     * @return string if bad
     */
    _validateArgs (event, listener) {
        if (!event || !listener) {
            return 'Null or undefined arguments passed to event bus';
        }
        if (typeof event !== 'string' || typeof listener !== 'function') {
            return 'Invalid argument types passed to event bus';
        }
        return null;
    }
}

module.exports = EventBus;
