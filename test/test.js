/*

test.js - stepping configuration test

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

test['stepping should return an initial state prior to any dispatch'] = function (test) {
    test.expect(7);
    var stepping = tart.stepping();

    var actor = stepping.sponsor(function (message) {});
    var actor2 = stepping.sponsor(function (message) {});
    actor(actor2);

    test.equal(stepping.effect.created.length, 2);
    test.strictEqual(stepping.effect.created[0].self, actor);
    test.strictEqual(stepping.effect.created[1].self, actor2);
    test.equal(stepping.effect.sent.length, 1);
    test.strictEqual(stepping.effect.sent[0].message, actor2);
    test.strictEqual(stepping.effect.sent[0].context.self, actor);
    test.strictEqual(stepping.effect.sent[0].cause, undefined);
    test.done();
};

test['stepping should dispatch one event on dispatch() call'] = function (test) {
    test.expect(3);
    var stepping = tart.stepping();

    var dispatched = false;
    var testBeh = function testBeh(message) {
        test.equal(message, 'foo');
        dispatched = true;
    };

    var actor = stepping.sponsor(testBeh);
    actor('foo');
    actor('bar');

    test.ok(!dispatched);
    stepping.dispatch();
    test.ok(dispatched);
    test.done();
};

test['stepping should not change initial state after dispatching'] = function (test) {
    test.expect(7);
    var stepping = tart.stepping();

    var actor = stepping.sponsor(function (message) {});
    var actor2 = stepping.sponsor(function (message) {});
    actor(actor2);
    var initial = stepping.effect;

    stepping.dispatch();
    test.equal(initial.created.length, 2);
    test.strictEqual(initial.created[0].self, actor);
    test.strictEqual(initial.created[1].self, actor2);
    test.equal(initial.sent.length, 1);
    test.strictEqual(initial.sent[0].message, actor2);
    test.strictEqual(initial.sent[0].context.self, actor);
    test.strictEqual(initial.sent[0].cause, undefined);
    test.done();
};

test['dispatch returns an effect of actor processing the message'] = function (test) {
    test.expect(7);
    var stepping = tart.stepping();

    var createdBeh = function createdBeh(message) {};
    var becomeBeh = function becomeBeh(message) {};

    var testBeh = function testBeh(message) {
        var actor = this.sponsor(createdBeh); // create
        actor('foo'); // send
        this.behavior = becomeBeh; // become
    };

    var actor = stepping.sponsor(testBeh);
    actor('bar');

    var effect = stepping.dispatch();
    test.strictEqual(effect.created[0].behavior, createdBeh);
    test.equal(effect.event.message, 'bar');
    test.equal(effect.sent[0].message, 'foo');
    test.strictEqual(effect.behavior, testBeh);
    test.strictEqual(effect.became, becomeBeh);
    test.strictEqual(effect.event.context.behavior, becomeBeh);
    test.ok(!effect.exception);
    test.done();
};

test['dispatch returns an effect containing exception if actor throws one'] = function (test) {
    test.expect(2);
    var stepping = tart.stepping();

    var exception;

    var crashBeh = function crashBeh(message) {
        exception = new Error('boom');
        throw exception;
    };

    var actor = stepping.sponsor(crashBeh);
    actor('explode');

    var effect = stepping.dispatch();
    test.strictEqual(effect.behavior, crashBeh);
    test.strictEqual(effect.exception, exception);
    test.done();
};

test["dispatch returns 'false' if no events to dispatch"] = function (test) {
    test.expect(1);
    var stepping = tart.stepping();

    var effect = stepping.dispatch();
    test.strictEqual(effect, false);
    test.done();
};

test['both external and behavior effects are visible'] = function (test) {
    test.expect(33);
    var stepping = tart.stepping();
    var effect;
    var step = 0;  // step counter

    var first = function first(message) {
        test.equal(message, 0);
        test.equal(step, 1);
        ++step;
        this.self(-1);
        this.behavior = second;
    };
    var second = function second(message) {
        test.equal(message, -1);
        test.equal(step, 4);
        ++step;
        this.behavior = third;
    };
    var third = function third(message) {
        test.equal(message, 2);
        test.equal(step, 6);
        ++step;
        this.behavior = boom;
    };
    var boom = function boom(message) {
        throw new Error('Should not be called!');
    };
    var actor = stepping.sponsor(first);
    actor(0);

    effect = stepping.effect;
    test.equal(step, 0);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 1);
    test.equal(effect.created[0].self, actor);
    test.equal(effect.sent.length, 1);
    test.equal(effect.sent[0].message, 0);

    effect = stepping.dispatch();
    test.equal(step, 2);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 0);
    test.equal(effect.sent.length, 1);
    test.equal(effect.sent[0].message, -1);

    actor(2);
    var unused = stepping.sponsor(boom);

    effect = stepping.effect;
    test.equal(step, 3);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 1);
    test.equal(effect.created[0].self, unused);
    test.equal(effect.sent.length, 1);
    test.equal(effect.sent[0].message, 2);

    effect = stepping.dispatch();
    test.equal(step, 5);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 0);
    test.equal(effect.sent.length, 0);

    effect = stepping.dispatch();
    test.equal(step, 7);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 0);
    test.equal(effect.sent.length, 0);

    effect = stepping.dispatch();
    test.equal(step, 8);
    ++step;
    test.strictEqual(effect, false);

    test.done();
};