var test = require('node:test');
var assert = require('node:assert');

require('./legacy-compat');
var common = require('./common');

// The Node core event tests were written against tape's assertion object,
// which each test file reaches through `common.test`. Rather than rewrite
// every assertion, expose a tiny tape-compatible adapter backed by
// node:assert so the test bodies run unchanged under node:test.
var currentEndCallbacks = [];

common.test = {
  strictEqual: function(actual, expected, msg) { assert.strictEqual(actual, expected, msg); },
  equal: function(actual, expected, msg) { assert.strictEqual(actual, expected, msg); },
  ok: function(value, msg) { assert.ok(value, msg); },
  fail: function(msg) { assert.fail(msg || 'fail'); },
  throws: function(fn, expected, msg) { assert.throws(fn, expected, msg); },
  doesNotThrow: function(fn, expected, msg) { assert.doesNotThrow(fn, expected, msg); },
  comment: function(msg) { console.log('# ' + msg); },
  end: function() {},
  // tape exposes `t.on('end', cb)` for per-test teardown; route it to a
  // per-file list the runner drains after each file's body completes.
  on: function(event, cb) { if (event === 'end') currentEndCallbacks.push(cb); }
};

// Wrap each test file in a node:test subtest. Top-level tests run
// sequentially, so a shared `currentEndCallbacks` is safe.
function run(file) {
  test(file, async function() {
    currentEndCallbacks = [];
    var exp = require(file);
    if (exp && typeof exp.then === 'function') {
      await exp;
    }
    var endCallbacks = currentEndCallbacks;
    for (var i = 0; i < endCallbacks.length; i++) {
      endCallbacks[i]();
    }
  });
}

run('./add-listeners.js');
run('./check-listener-leaks.js');
run('./errors.js');
run('./events-list.js');
run('./events-once.js');
run('./listener-count.js');
run('./listeners-side-effects.js');
run('./listeners.js');
run('./max-listeners.js');
run('./method-names.js');
run('./modify-in-emit.js');
run('./num-args.js');
run('./once.js');
run('./prepend.js');
run('./set-max-listeners-side-effects.js');
run('./special-event-names.js');
run('./subclass.js');
run('./symbols.js');
run('./remove-all-listeners.js');
run('./remove-listeners.js');

// tape's onFinish ran the deferred common.mustCall checks (and other teardown
// assertions) once the whole run completed. Run them from a final subtest
// rather than an after() hook: top-level tests execute sequentially, so this
// runs last, and unlike an after() hook an assertion failure here actually
// fails the run and sets a non-zero exit code.
test('deferred checks (mustCall)', function() {
  common.drainOnFinish();
});
