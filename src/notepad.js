'use strict';

var _ = require('lodash');

class Notepad {

    constructor () {
        var self = this;
        self._notepad = {
            _switch: {},
            _fetch: {}
        };
    }

    /**
     * Add a switch condition to the notepad to be used by behavior trees
     * @param switchName Name of the switch, found in description field in *.bt
     * @param value Value that will be evaluated by switch
     */
    addSwitchCondition (switchName, value) {
        var self = this;

        if (!_.isNil(self._notepad._switch[switchName])) {
            console.warn('Warning: Overwriting an existing value for switch ' + switchName);
        }
        self._notepad._switch[switchName] = value;
    }

    /**
     * Get the switch condition
     * @param switchName Name of the switch the condition is for
     */
    getSwitchCondition (switchName) {
        var self = this;

        if (_.isNil(self._notepad._switch[switchName])) {
            return false;
        } else {
            return self._notepad._switch[switchName];
        }
    }

    /**
     * Add the result of some backend fetch request
     * @param event Fetch event
     * @param err Error if one occurred
     * @param result Result of the fetch
     */
    addFetchResult (event, err, result) {
        var self = this;

        if (self._notepad._fetch[event]) {
            console.warn('Warning: Overwriting an existing object for fetch event ' + event);
        }
        self._notepad._fetch[event] = {
            error: err,
            result: result
        };
    }

    /**
     * Gets JS object containing err and result of fetch
     * @param event Fetch event
     */
    getFetchResult (event) {
        var self = this;
        return self._notepad._fetch[event] || null;
    }

    /**
     * Add an generic item to notepad
     * @param params Object containing item info
     */
    addItem (params) {
        var self = this;

        if (self._notepad[params.name]) {
            if (!self._notepad[params.name].overwrite) {
                console.error('Error: Object ' + params.name + ' in notepad set to read only');
                return;
            } else {
                console.warn('Warning: Overwriting an existing object for item ' + params.name);
            }
        }

        self._notepad[params.name] = {
            item: params.item,
            overwrite: _.isNil(params.overwrite) ? true : params.overwrite,
            permanent: _.isNil(params.permanent) ? false : params.permanent
        };
    }

    /**
     * Gets the item at key [name]
     * @param name Name (key) of the item
     */
    getItem (name) {
        var self = this;

        if (self._notepad[name]) {
            return self._notepad[name].item;
        } else {
            return null;
        }
    }

    /**
     * Clears the notepad except for those with permanent = true
     */
    clearNotepad () {
        var self = this;

        Object.keys(self._notepad).map(function (key) {
            if (!self._notepad[key].permanent) {
                delete self._notepad[key];
            }
        });

        self._notepad._fetch = {};
        self._notepad._switch = {};
    }
}

module.exports = Notepad;
