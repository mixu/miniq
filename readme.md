# miniq

miniq is yet another tiny async control flow library. It implements parallelLimit, with the ability to share the concurrency-limited queue.

## Features

- small: miniq only implements `parallelLimit`
- can be used for all three basic control flow patterns
  - `series` = `parallel(1, tasks, onDone)`
  - `parallel` without a concurrency limit = `parallel(Infinity, tasks, onDone)`
  - `parallel` with a concurrency = default behavior
- no result passing: Many control flow libraries have a dozen variants which simply pass the result around in slightly different ways (e.g. `chain` vs. `map`). I'd rather just use JavaScript's scope rules to handle all those variants rather than have specialized functions for each thing.

miniq has one advanced feature, which is the ability to share the concurrency-limited queue among multiple different tasks. In other words, many different sets of operations can share the same queue and run limit. Each set of tasks can have it's own `onDone` function, but they share the same concurrency limit.

For example, if you are writing something that does a recursive directory traversal and does various (file system) operations, you can push all the operations into the same queue. This will allow you to limit (file system) concurrency across multiple operations.

## Installation

    npm install --save miniq

## API

`parallel(limit, tasks, [onDone])`:

- `limit` is a number which controls the maximum number of concurrent tasks. Set `limit = 1` for serial execution and `limit = Infinity` for unlimited parallelism.
- `onDone` is a callback `function(err) { ... }`; it is called when the tasks it is associated with have run
- `tasks` are callbacks `function(done) { ... }` which should call `done()` when they are complete.

The return value is an object with a function `.exec(tasks, onDone)`. Calling this function appends the new set of tasks and queues the `onDone` function once all of those tasks have completed.

## Example: replacement for `parallelLimit`

    var parallel = require('miniq');

    parallel(10, [
      function(done) {
        fs.readFile(function(err, result) {
          if(err) {
            return done(err); // done takes one argument: the error
          }
        }
      },
    ], function(err) {
      // err is sent if any of the tasks returned an error
    });


## Example: replacement for `parallel`

    var parallel = require('miniq');

    parallel(Infinity, [
      function(done) { ... },
    ], function(err) {
      // err is sent if any of the tasks returned an error
    });

## Example: replacement for `series`

    var parallel = require('miniq');

    parallel(1, [
      function(done) { ... },
    ], function(err) {
      // err is sent if any of the tasks returned an error
    });

## Example: using miniq as a shared maximum-concurrency limited queue

    var parallel = require('miniq');

    var p = parallel(3, [
      function(done) {
        // add more tasks
        p.exec([ function(done) { ... } }], function(err) { ... });
        done();
      },
      function b(done) { ... }
    ], function(err) { ... });
