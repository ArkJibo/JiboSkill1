'use strict';

var Notepad = require('../../src/notepad');
var expect = require('chai').expect;

describe('Notepad', function () {
    var notepad;
    before(function () {
        notepad = new Notepad({});
    });

    afterEach(function () {
        //  Clear the notepad
        notepad._notepad = {
            _switch: {},
            _fetch: {}
        };
    });

    describe('#addSwitchCondition()', function () {
        it('should add to notepad correctly', function () {
            notepad.addSwitchCondition('switch', 'spoons');
            expect(notepad._notepad._switch.switch).to.equal('spoons');
        });
    });

    describe('#getSwitchCondition()', function () {
        it('should get switch condition', function () {
            notepad._notepad._switch.switch = 'spoons';
            expect(notepad.getSwitchCondition('switch')).to.equal('spoons');
        });

        it('should return false if no condition', function () {
            expect(notepad.getSwitchCondition('blah')).to.be.false;
        });
    });

    describe('#addFetchResult()', function () {
        it('should add to notepad correctly', function () {
            notepad.addFetchResult('event', null, 'lotion');
            expect(notepad._notepad._fetch.event).to.exist;
            expect(notepad._notepad._fetch.event.error).to.be.null;
            expect(notepad._notepad._fetch.event.result).to.equal('lotion');
        });
    });

    describe('#getFetchResult()', function () {
        it('should get correct result', function () {
            notepad._notepad._fetch.event = {
                error: 'massive error',
                result: null
            };

            var result = notepad.getFetchResult('event');
            expect(result).to.exist;
            expect(result.error).to.equal('massive error');
            expect(result.result).to.be.null;
        });

        it('should get null if no result', function () {
            var result = notepad.getFetchResult('blah');
            expect(result).to.be.null;
        });
    });

    describe('#addItem()', function () {
        it('should add item correctly', function () {
            notepad.addItem({
                name: 'erk',
                item: {
                    value: 'veg'
                },
                overwrite: true,
                permanent: false
            });
            expect(notepad._notepad.erk).to.exist;
            expect(notepad._notepad.erk.item.value).to.equal('veg');
            expect(notepad._notepad.erk.overwrite).to.be.true;
            expect(notepad._notepad.erk.permanent).to.be.false;
        });

        it('should not let overwrite happen if false', function () {
            notepad.addItem({
                name: 'erk',
                item: {
                    value: 'veg'
                },
                overwrite: false,
                permanent: false
            });
            expect(notepad._notepad.erk).to.exist;
            expect(notepad._notepad.erk.item.value).to.equal('veg');
            expect(notepad._notepad.erk.overwrite).to.be.false;
            expect(notepad._notepad.erk.permanent).to.be.false;

            notepad.addItem({
                name: 'erk',
                item: {
                    value: 'goober'
                },
                overwrite: true,
                permanent: true
            });
            expect(notepad._notepad.erk).to.exist;
            expect(notepad._notepad.erk.item.value).to.equal('veg');
            expect(notepad._notepad.erk.overwrite).to.be.false;
            expect(notepad._notepad.erk.permanent).to.be.false;
        });

        it('should set defaults correctly', function () {
            notepad.addItem({
                name: 'erk',
                item: {
                    value: 'veg'
                }
            });
            expect(notepad._notepad.erk).to.exist;
            expect(notepad._notepad.erk.item.value).to.equal('veg');
            expect(notepad._notepad.erk.overwrite).to.be.true;
            expect(notepad._notepad.erk.permanent).to.be.false;
        });
    });

    describe('#getItem()', function () {
        it('should get item correctly', function () {
            notepad._notepad.erk = {
                item: {
                    value: 'veg'
                },
                overwrite: false,
                permanent: false
            };

            var result = notepad.getItem('erk');
            expect(result).to.exist;
            expect(result.value).to.equal('veg');
        });

        it('should return null if no item', function () {
            expect(notepad.getItem('blah')).to.equal.null;
        });
    });

    describe('#clearNotepad()', function () {
        it('should delete the correct stuff', function () {
            notepad._notepad = {
                _fetch: {
                    a: {},
                    b: {}
                },
                _switch: {
                    a: 'value',
                    b: 'another value'
                },
                c: {
                    permanent: true
                },
                d: {
                    permanent: false
                }
            };

            notepad.clearNotepad();
            expect(Object.keys(notepad._notepad._fetch).length).to.equal(0);
            expect(Object.keys(notepad._notepad._switch).length).to.equal(0);
            expect(notepad._notepad.d).to.not.exist;
            expect(notepad._notepad.c).to.exist;
            expect(notepad._notepad.c.permanent).to.be.true;
        });
    });
});
