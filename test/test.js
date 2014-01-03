/*

tracing.js - tracing configuration test

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

test['tracing should return an initial state prior to any dispatch'] = function (test) {
    test.expect(7);
    var tracing = tart.tracing();

    var actor = tracing.sponsor(function (message) {});
    var actor2 = tracing.sponsor(function (message) {});
    actor(actor2);

    test.equal(tracing.effect.created.length, 2);
    test.strictEqual(tracing.effect.created[0].self, actor);
    test.strictEqual(tracing.effect.created[1].self, actor2);
    test.equal(tracing.effect.sent.length, 1);
    test.strictEqual(tracing.effect.sent[0].message, actor2);
    test.strictEqual(tracing.effect.sent[0].context.self, actor);
    test.strictEqual(tracing.effect.sent[0].cause, undefined);
    test.done();
};

test['tracing should dispatch one event on dispatch() call'] = function (test) {
    test.expect(3);
    var tracing = tart.tracing();

    var dispatched = false;
    var testBeh = function testBeh(message) {
        test.equal(message, 'foo');
        dispatched = true;
    };

    var actor = tracing.sponsor(testBeh);
    actor('foo');
    actor('bar');

    test.ok(!dispatched);
    tracing.dispatch();
    test.ok(dispatched);
    test.done();
};

test['tracing should not change initial state after dispatching'] = function (test) {
    test.expect(7);
    var tracing = tart.tracing();

    var actor = tracing.sponsor(function (message) {});
    var actor2 = tracing.sponsor(function (message) {});
    actor(actor2);
    var initial = tracing.effect;

    tracing.dispatch();
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
    test.expect(9);
    var tracing = tart.tracing();

    var createdBeh = function createdBeh(message) {};
    var becomeBeh = function becomeBeh(message) {};

    var testBeh = function testBeh(message) {
        var actor = this.sponsor(createdBeh); // create
        actor('foo'); // send
        this.behavior = becomeBeh; // become
    };

    var actor = tracing.sponsor(testBeh);
    actor('bar');

    var effect = tracing.dispatch();
    test.strictEqual(effect.created[0].behavior, createdBeh);
    test.equal(effect.event.message, 'bar');
    test.equal(effect.sent[0].message, 'foo');
    test.strictEqual(effect.sent[0].cause.message, 'bar');
    test.strictEqual(effect.sent[0].cause.context.self, actor);
    test.strictEqual(effect.behavior, testBeh);
    test.strictEqual(effect.became, becomeBeh);
    test.strictEqual(effect.event.context.behavior, becomeBeh);
    test.ok(!effect.exception);
    test.done();
};

test['dispatch returns an effect containing exception if actor throws one'] = function (test) {
    test.expect(2);
    var tracing = tart.tracing();

    var exception;

    var crashBeh = function crashBeh(message) {
        exception = new Error('boom');
        throw exception;
    };

    var actor = tracing.sponsor(crashBeh);
    actor('explode');

    var effect = tracing.dispatch();
    test.strictEqual(effect.behavior, crashBeh);
    test.strictEqual(effect.exception, exception);
    test.done();
};

test["dispatch returns 'false' if no events to dispatch"] = function (test) {
    test.expect(1);
    var tracing = tart.tracing();

    var effect = tracing.dispatch();
    test.strictEqual(effect, false);
    test.done();
};

test['effects of a dispatched event become part of history'] = function (test) {
    test.expect(12);
    var tracing = tart.tracing();

    var createdBeh = function createdBeh(message) {};
    var becomeBeh = function becomeBeh(message) {};

    var testBeh = function testBeh(message) {
        var actor = this.sponsor(createdBeh); // create
        actor('foo'); // send
        this.behavior = becomeBeh; // become
    };

    var actor = tracing.sponsor(testBeh);
    actor('bar');

    test.equal(tracing.history.length, 0);
    var effect = tracing.dispatch();
    test.equal(tracing.history.length, 2);
    test.strictEqual(effect, tracing.history[1]);
    test.strictEqual(effect.created[0].behavior, createdBeh);
    test.equal(effect.event.message, 'bar');
    test.equal(effect.sent[0].message, 'foo');
    test.strictEqual(effect.sent[0].cause.message, 'bar');
    test.strictEqual(effect.sent[0].cause.context.self, actor);
    test.strictEqual(effect.behavior, testBeh);
    test.strictEqual(effect.became, becomeBeh);
    test.strictEqual(effect.event.context.behavior, becomeBeh);
    test.ok(!effect.exception);
    test.done();
};

test['both external and behavior effects are visible'] = function (test) {
    test.expect(33);
    var tracing = tart.tracing();
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
    var actor = tracing.sponsor(first);
    actor(0);

    effect = tracing.effect;
    test.equal(step, 0);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 1);
    test.equal(effect.created[0].self, actor);
    test.equal(effect.sent.length, 1);
    test.equal(effect.sent[0].message, 0);

    effect = tracing.dispatch();
    test.equal(step, 2);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 0);
    test.equal(effect.sent.length, 1);
    test.equal(effect.sent[0].message, -1);

    actor(2);
    var unused = tracing.sponsor(boom);

    effect = tracing.effect;
    test.equal(step, 3);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 1);
    test.equal(effect.created[0].self, unused);
    test.equal(effect.sent.length, 1);
    test.equal(effect.sent[0].message, 2);

    effect = tracing.dispatch();
    test.equal(step, 5);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 0);
    test.equal(effect.sent.length, 0);

    effect = tracing.dispatch();
    test.equal(step, 7);
    ++step;
    test.ok(effect);
    test.equal(effect.created.length, 0);
    test.equal(effect.sent.length, 0);

    effect = tracing.dispatch();
    test.equal(step, 8);
    ++step;
    test.strictEqual(effect, false);

    test.done();
};