var extend = require('xtend');
var Transform = require('stream').Transform;

module.exports = Secondary;

function Secondary(name, db, reduce) {
  if (!reduce) {
    reduce = function(value) {
      return value[name];
    };
  }

  var batch = db.batch;
  var sub = db.sublevel(name);

  db.put = function(key, value, opts, fn) {
    if (typeof opts == 'function') {
      fn = opts;
      opts = {};
    }
   
    batch.call(db, [
      extend({
        type: 'put',
        key: key,
        value: value
      }, opts), {
        type: 'put',
        key: reduce(value),
        value: key,
        prefix: sub
      }
    ], fn);
  };

  db.del = function(key, fn) {
    db.get(key, function(err, value) {
      if (err && err.name == 'NotFoundError') return fn();
      if (err) return fn(err);

      batch.call(db, [
        {
          type: 'del',
          key: key
        }, {
          type: 'del',
          key: reduce(value),
          prefix: sub
        }
      ], fn);
    });
  };

  db.batch = function(ops, fn) {
    var add = [];

    function next(i) {
      var op = ops[i];
      if (!op) return write();

      if (op.prefix) {
        next(i + 1);
      } else if (op.type == 'put') {
        add.push({
          type: 'put',
          key: reduce(op.value),
          value: op.key,
          prefix: sub
        });
        next(i + 1);
      } else {
        db.get(op.key, function(err, value) {
          if (err) return fn(err);
          add.push({
            type: 'del',
            key: reduce(value),
            prefix: sub
          });
          next(i + 1);
        });
      }
    }

    next(0);

    function write() {
      batch.call(db, ops.concat(add), fn);
    }
  }

  var secondary = db['by' + name[0].toUpperCase() + name.slice(1)] = {};

  secondary.get = function(key, opts, fn) {
    if (typeof opts == 'function') {
      fn = opts;
      opts = {};
    }

    sub.get(key, function(err, value) {
      if (err) return fn(err);
      db.get(value, opts, fn);
    });
  };

  secondary.del = function(key, opts, fn) {
    if (typeof opts == 'function') {
      fn = opts;
      opts = {};
    }

    sub.get(key, function(err, value) {
      if (err) return fn(err);
      db.del(value, opts, fn);
    });
  };

  secondary.createValueStream = function(opts) {
    opts = opts || {};
    opts.keys = false;
    return secondary.createReadStream(opts);
  }

  secondary.createKeyStream = function(opts) {
    opts = opts || {};
    opts.values = false;
    return secondary.createReadStream(opts);
  }

  secondary.createReadStream = function(opts) {
    opts = opts || {};
    var tr = Transform({ objectMode: true });

    tr._transform = function(chunk, enc, done) {
      var key = chunk.value;
      db.get(key, function(err, value) {
        if (err) return done(err);
        if (opts.values === false) {
          done(null, key);
        } else if (opts.keys === false) {
          done(null, value);
        } else {
          done(null, {
            key: key,
            value: value
          });
        }
      });
    };

    var opts2 = extend({}, opts);
    opts2.keys = opts2.values = true;
    sub.createReadStream(opts2).pipe(tr);

    return tr;
  };

  return db;
}
