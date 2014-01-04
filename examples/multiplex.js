/*

multiplex.js - multiplex configuration dispatch example

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

var root = require('tart');
var tart = require('../index.js');
var util = require('util');

var rootSponsor = root.minimal();
/*
var rootControl = tart.stepping();
var rootSponsor = rootControl.sponsor;
*/

var steppingA = tart.stepping();
var steppingB = tart.stepping();
var steppingC = tart.stepping();

/*
Create an actor behavior that calls a synchronous object method
using `message.arguments` as the argument list
and sending the return value to `message.customer`.
*/
var adapter = function adapter(obj, fn) {
    return function applyBeh(message) {
        message.customer(fn.apply(obj, message.arguments));
    };
};

/*
Create an actor behavior that multiplexes
among a list of child configurations,
dispatching one event for each (round-robin)
until no events remain.
*/
var roundRobin = function roundRobin(children) {
    var m = children.length;
    var n = m;  // countdown to idle
    var i = 0;  // current child index
    var dispatchBeh = function dispatchBeh() {
        var child = children[i];
        child({
            arguments: [],
            customer: this.self
        });
        this.behavior = effectBeh;  // wait for dispatch effect
    };
    var effectBeh = function effectBeh(effect) {
        if (effect) {
/*
            console.log(util.inspect(effect, {depth: null}));
*/
            n = m;  // reset idle countdown
        } else {
            --n;  // countdown idle children
        }
        if (n > 0) {
            ++i;  // advance to next child
            if (i >= m) {
                i = 0;
            }
            this.self();
            this.behavior = dispatchBeh;  // dispatch next event
        }
    };
    return dispatchBeh;
};

/**/
var dispatchA = rootSponsor(adapter(steppingA, steppingA.dispatch));
var dispatchB = rootSponsor(adapter(steppingB, steppingB.dispatch));
var dispatchC = rootSponsor(adapter(steppingC, steppingC.dispatch));

var multiplexer = rootSponsor(roundRobin([
    dispatchA, 
    dispatchC, 
    dispatchB, 
    dispatchC 
]));
/**/

/*
Create an actor behavior that multiplexes
among a list of child configurations,
calling `eventLoop(options)` for each
until all event queues are exhausted.
*/
var multiplex = function multiplex(children) {
    var m = children.length;
    var n = m;  // countdown to idle
    var i = 0;  // current child index
    var dispatchBeh = function dispatchBeh() {
        var child = children[i];
        child.eventLoop({
            arguments: [ child.options ],
            customer: this.self
        });
        this.behavior = statusBeh;  // wait for eventLoop status
    };
    var statusBeh = function statusBeh(empty) {
    	console.log(i, empty);
        if (empty) {
            --n;  // countdown idle children
        } else {
            n = m;  // reset idle countdown
        }
        if (n > 0) {
            ++i;  // advance to next child
            if (i >= m) {
                i = 0;
            }
            this.self();
            this.behavior = dispatchBeh;  // dispatch next event
        }
    };
    return dispatchBeh;
};

/*
var eventLoopA = rootSponsor(adapter(steppingA, steppingA.eventLoop));
var eventLoopB = rootSponsor(adapter(steppingB, steppingB.eventLoop));
var eventLoopC = rootSponsor(adapter(steppingC, steppingC.eventLoop));

var multiplexer = rootSponsor(multiplex([
    { eventLoop:eventLoopA, options:{ count:1 } }, 
    { eventLoop:eventLoopB }, 
    { eventLoop:eventLoopC, options:{} }
]));
/**/

/*
Create an actor behavior that counts down to zero,
printing labelled messages to the console log.
*/
var countdown = function countdown(label) {
    return function countdownBeh(count) {
        console.log(label, count);
        if (--count > 0) {
            this.self(count);
        }
    };
};

var countdownA = steppingA.sponsor(countdown('--A--'));
var countdownB = steppingB.sponsor(countdown('--B--'));
var countdownC = steppingC.sponsor(countdown('--C--'));

countdownA(2);
countdownB(3);
countdownC(5);

multiplexer();  // start multiplexing
/*
rootControl.eventLoop({
    log: function(effect) {
        console.log(util.inspect(effect, {depth: null}));
    }
});
*/