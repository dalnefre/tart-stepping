/*

eventLoop.js - eventLoop tests

The MIT License (MIT)

Copyright (c) 2013 Dale Schumacher, Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/
"use strict";

var tart = require('../index.js');

var test = module.exports = {};

test["eventLoop by default dispatches all events and returns 'true'"] = function (test) {
    test.expect(3);
    var controls = tart.stepping();

    var firstBeh = function firstBeh(message) {
        test.equal(message, 'first');
        this.self('second');
        this.behavior = secondBeh;
    };

    var secondBeh = function secondBeh(message) {
        test.equal(message, 'second');
        this.behavior = failBeh;
    };

    var failBeh = function failBeh(message) {
        throw new Error('Should not be called!');
    };

    var actor = controls.sponsor(firstBeh);
    actor('first');
    test.ok(controls.eventLoop());
    test.done();
};

test["eventLoop dispatches specified number of events and returns 'false' if not drained"] = function (test) {
    test.expect(4);
    var controls = tart.stepping();

    var actor = controls.sponsor(function (message) {
        test.ok(message);
        this.self(message + 1);
    });
    actor(1);

    test.strictEqual(false, controls.eventLoop({count: 3}));
    test.done();
};

test["eventLoop throw exception and pause by default if actor behavior throws an exception"] = function (test) {
    test.expect(5);
    var controls = tart.stepping();
    var exception = new Error('failed');

    var failBeh = function failBeh(message) {
        test.ok(true);
        throw exception;
    };

    var actor = controls.sponsor(failBeh);
    actor('fail once');
    actor('fail again');

    test.throws(controls.eventLoop, function (err) {
        if ((err instanceof Error) && err.message === 'failed') {
            return true;
        }
    });
    test.throws(controls.eventLoop, function (err) {
        if ((err instanceof Error) && err.message === 'failed') {
            return true;
        }
    });
    test.ok(controls.eventLoop());
    test.done();
};

test["eventLoop allows fail handler to be overriden"] = function (test) {
    test.expect(3);
    var controls = tart.stepping();
    var exception = new Error('failed');

    var failBeh = function failBeh(message) {
        test.ok(true);
        throw exception;
    };

    var actor = controls.sponsor(failBeh);
    actor('fail once');
    actor('fail again');

    // ignore errors
    test.ok(controls.eventLoop({fail: function () {}}));
    test.done();
};

test["eventLoop allows for logging effects of dispatched events"] = function (test) {
    test.expect(5);
    var controls = tart.stepping();

    var firstBeh = function firstBeh(message) {
        test.equal(message, 'first');
        this.self('second');
        this.behavior = secondBeh;
    };

    var secondBeh = function secondBeh(message) {
        test.equal(message, 'second');
        this.behavior = failBeh;
    };

    var failBeh = function failBeh(message) {
        throw new Error('Should not be called!');
    };

    var actor = controls.sponsor(firstBeh);
    actor('first');
    test.ok(controls.eventLoop({
        log: function (effect) {
            if (effect.event) { // first effect has no cause
                test.strictEqual(effect.event.context.self, actor);
            }
        }
    }));
    test.done();
};