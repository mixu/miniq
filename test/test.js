var fs = require('fs'),
    assert = require('assert'),
    parallel = require('../index.js');

exports['parallel tests'] = {

  before: function() {
    var self = this;
    this.baseTasks = [
      function(done) {
        setTimeout(function() {
          self.callOrder.push(1);
          done();
        }, 50);
      },
      function(done) {
        setTimeout(function() {
          self.callOrder.push(2);
          done();
        }, 100);
      },
      function(done) {
        setTimeout(function() {
          self.callOrder.push(3);
          done();
        }, 25);
      }
    ];
  },

  'basic series': function(testDone) {
    var self = this;
    this.callOrder = [];
    parallel(1, this.baseTasks, function(err) {
      assert.ok(!err);
      assert.deepEqual(self.callOrder, [1, 2, 3]);
      testDone();
    });
  },

  'basic two': function(testDone) {
    var self = this;
    this.callOrder = [];
    parallel(2, this.baseTasks, function(err) {
      assert.ok(!err);
      assert.deepEqual(self.callOrder, [1, 3, 2]);
      testDone();
    });
  },

  'basic unlimited': function(testDone) {
    var self = this;
    this.callOrder = [];
    parallel(Infinity, this.baseTasks, function(err) {
      assert.ok(!err);
      assert.deepEqual(self.callOrder, [3, 1, 2]);
      testDone();
    });
  },

  'empty': function(testDone) {
    parallel(1, [], function(err) {
      assert.ok(!err);
      testDone();
    });
  },

  'error serial': function(testDone) {
    parallel(1, [
      function(done) {
        done('err1');
      },
      function(done) {
        // for serial execution, the second function should not be called
        assert.ok(false);
        done('err2');
      }], function(err) {
        assert.ok(err);
        assert.equal(err, 'err1');
        testDone();
      });
  },

  'error parallel': function(testDone) {
    parallel(8, [
      function(done) {
        done('err1');
      },
      function(done) {
        done('err2');
      }], function(err) {
        // parallel: only guarantee that not called twice and called once with the
        // first error
        assert.ok(err);
        assert.equal(err, 'err1');
        testDone();
      });
  },

  'no callback': function(testDone) {
    parallel(1, [
      function(done) { done(); },
      function(done) { done(); testDone(); }
    ]);
  },

  'no callback, single function rather than array': function(testDone) {
    parallel(1, function(done) { done(); testDone(); });
  },


  'add to queue while exec': function(testDone) {
    var callOrder = [];

    // there are no guarantees that one "done" action runs
    // before another (unless you do parallelism = 1)
    function checkDone() {
      // console.log(callOrder);
      if(callOrder.indexOf('1-end') == -1 ||
          callOrder.indexOf('2-end') == -1) {
        return;
      }

      var expected = [
        '1-1', '1-2', '1-end',
        '2-1', '2-2', '2-end'
      ];
      assert.ok(
        expected.every(function(item) { return callOrder.indexOf(item) > -1; }),
        'every callback should have run');

      testDone();
    }


    var p = parallel(3, [
      function a(done) {
        callOrder.push('1-1');
        // add more tasks
        p.exec([
          function c(done) {
            setTimeout(function() {
              callOrder.push('2-1');
              done();
            }, 20);
          },
          function d(done) {
            callOrder.push('2-2');
            done();
          }], function(err) {
            callOrder.push('2-end');
            checkDone();
          });
        done();
      },
      function b(done) {
        setTimeout(function() {
          callOrder.push('1-2');
          done();
        }, 100);
      }
      ], function(err) {
        callOrder.push('1-end');
        checkDone();
    });
  },

  'add to queue while exec, error': function(testDone) {
    var callOrder = [];

    // there are no guarantees that one "done" action runs
    // before another (unless you do parallelism = 1)
    function checkDone() {
      // console.log(callOrder);
      if(callOrder.indexOf('1-end-err') == -1 ||
          callOrder.indexOf('2-end-err') == -1) {
        return;
      }

      var expected = [
        '1-1-err', '1-end-err',
        '2-1-run', '2-2-run', '2-1', '2-2-err', '2-end-err' ];
      assert.ok(
        expected.every(function(item) { return callOrder.indexOf(item) > -1; }),
        'every callback should have run');

      testDone();
    }

    var p = parallel(3, [
      function a(done) {
        callOrder.push('1-1-err');
        // add more tasks
        p.exec([
          function c(done) {
          callOrder.push('2-1-run');
            setTimeout(function() {
              callOrder.push('2-1');
              done();
            }, 20);
          },
          function d(done) {
            callOrder.push('2-2-run');
            setTimeout(function() {
              callOrder.push('2-2-err');
              done('2-2-err');
            }, 50);
          }], function(err) {
            if(err) {
              callOrder.push('2-end-err');
            } else {
              callOrder.push('2-end');
            }
            checkDone();
          });
        done('1-1-err');
      },
      function b(done) {
        callOrder.push('1-2-run');
        setTimeout(function() {
          callOrder.push('1-2');
          done();
        }, 100);
      }
      ], function(err) {
        if(err) {
          callOrder.push('1-end-err');
        } else {
          callOrder.push('1-end');
        }
        checkDone();
    });
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stderr.on('data', function (data) {
    if (/^execvp\(\)/.test(data)) {
      console.log('You need mocha: `npm install -g mocha`');
    }
  });
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
