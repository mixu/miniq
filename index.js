var microee = require('microee');

// setTimeout is very problematic since it consumes some resources on each invocation
// and cannot be optimized like process.nextTick
var delay = (process && process.nextTick ? process.nextTick : (setImmediate ? setImmediate : setTimeout));

function Parallel(limit) {
  this.limit = limit || Infinity;
  this.running = 0;
  this.tasks = [];
  this.removed = [];
}

microee.mixin(Parallel);

Parallel.prototype.concurrency = function(limit) {
  this.limit = limit;
  return this;
};

Parallel.prototype.exec = function(tasks, onDone) {
  var self = this,
      completed = [];

  if(!tasks || tasks.length == 0) {
    onDone && onDone();
    this._next();
    return this;
  }

  if (Array.isArray(tasks)) {
    // avoid concat for memory reasons
    tasks.forEach(function(task) {
      self.tasks.push(task);
    });
  } else {
    this.tasks.push(tasks);
  }

  function errHandler(err, task) {
    if(tasks.indexOf(task) > -1) {
      self.removeListener('error', errHandler);
      self.removeListener('done', doneHandler);
      self.removeTasks(tasks);
      onDone(err);
    }
  }
  function doneHandler(task) {
    if(tasks.indexOf(task) > -1) {
      completed.push(task);
    } else {
      return false;
    }
    var allDone = completed.length == tasks.length;
    if(allDone) {
      self.removeListener('error', errHandler);
      onDone();
    }
    return allDone;
  }

  if(onDone) {
    this.on('error', errHandler)
        .when('done', doneHandler);
  }
  this._next();
  return this;
};

Parallel.prototype._next = function() {
  var self = this;
  // if nothing is running and the queue is empty, emit empty
  if(self.running == 0 && self.tasks.length == 0) {
    self.emit('empty');
  }
  // if nothing is running, then we can safely clean the removed queue
  if(self.running == 0) {
    self.removed = [];
  }
  while(self.running < self.limit && self.tasks.length > 0) {
    // need this IIFE so `task` can be referred to later on with the right value
    self.running++;
    self._runTask(self.tasks.shift());
  }
};

Parallel.prototype._runTask = function(task) {
  var self = this;
  // avoid issues with deep recursion
  delay(function() {
    // check that the task is still in the queue
    // (as it may have been removed due to a failure)
    if(self.removed.indexOf(task) > -1) {
      self.running--;
      self._next();
      return;
    }

    task(function(err) {
      self.running--;
      if(err) {
        return self.emit('error', err, task);
      }
      self.emit('done', task);
      self._next();
    });
  }, 0);
};

Parallel.prototype.removeTasks = function(tasks) {
  var self = this;
  this.removed = this.removed.concat(tasks);
  tasks.forEach(function(task) {
    var index = self.tasks.indexOf(task);
    if(index > -1) {
      self.tasks.splice(index, 1);
    }
  });
};

module.exports = function(limit, tasks, onDone) {
  return new Parallel(limit).exec(tasks, onDone);
};
