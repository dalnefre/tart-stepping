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

var stepperA = rootSponsor(adapter(steppingA, steppingA.dispatch));
var stepperB = rootSponsor(adapter(steppingB, steppingB.dispatch));
var stepperC = rootSponsor(adapter(steppingC, steppingC.dispatch));

/*
Create an actor behavior that multiplexes
among a list of stepping configurations,
processing one event for each (round-robin)
until no events remain.
*/
var roundRobin = function roundRobin(steppers) {
    var m = steppers.length;
    var n = m;  // countdown to idle
    var i = 0;  // current stepper
    var dispatchBeh = function dispatchBeh() {
        steppers[i]({
            arguments: [],
            customer: this.self
        });
        this.behavior = statusBeh;  // wait for dispatch status
    };
    var statusBeh = function statusBeh(ok) {
        if (ok) {
            n = m;  // reset idle countdown
        } else {
            --n;  // countdown idle steppers
        }
        if (n > 0) {
            ++i;  // advance to next stepper
            if (i >= m) {
                i = 0;
            }
            this.self();
            this.behavior = dispatchBeh;  // dispatch next event
        }
    };
    return dispatchBeh;
};

var multiplexer = rootSponsor(roundRobin([
    stepperA, 
    stepperB, 
    stepperC 
]));

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