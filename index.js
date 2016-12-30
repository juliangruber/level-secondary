var extend = require('xtend');
var hooks = require('level-hooks');
var Transform = require('stream').Transform
  || require('readable-stream').Transform;

module.exports = Secondary;

function Secondary(db, idb, reduce) {
  if (db.sublevel && !db.hooks) {
    db.hooks = {}
    db.hooks.pre = db.pre
    db.hooks.post = db.post
  }

  if (!db.hooks) {
    hooks(db)
  }

  if (reduce && typeof reduce === 'string') {
    var reducerString = reduce
    reduce = function(value) {
      return value[reducerString]
    };
  }

  if (typeof reduce !== 'function') {
    throw new Error('Reduce argument must be a string or function')
  }

  db.hooks.pre(function(change, add) {
    if (change.type != 'put') return;
    idb.put(reduce(change.value), change.key)
  });

  var secondary = {};

  secondary.manifest = {
    methods: {
      get: { type: 'async' },
      del: { type: 'async' },
      createValueStream: { type: 'readable' },
      createKeyStream: { type: 'readable' },
      createReadStream: { type: 'readable' }
    }
  };

  secondary.get = op('get');
  secondary.del = op('del');

  function op(type) {
    return function (key, opts, fn) {
      if (typeof opts == 'function') {
        fn = opts;
        opts = {};
      }

      idb.get(key, function(err, value) {
        if (err) return fn(err);
        db[type](value, opts, fn);
      });
    };
  }

  secondary.createValueStream = function(opts) {
    (opts && opts || (opts = {})).keys = false;
    return secondary.createReadStream(opts);
  }

  secondary.createKeyStream = function(opts) {
    (opts && opts || (opts = {})).values = false;
    return secondary.createReadStream(opts);
  }

  secondary.createReadStream = function(opts) {
    opts = opts || {};
    var tr = Transform({ objectMode: true });

    tr._transform = function(chunk, enc, done) {
      var key = chunk.value;
      if (opts.values === false) {
        done(null, key);
        return;
      }

      db.get(key, function(err, value) {
        if (err && err.type == 'NotFoundError') {
          idb.del(key, done);
        } else if (err) {
          done(err);
        } else {
          emit();
        }

        function emit() {
          if (opts.keys === false) {
            done(null, value);
          } else {
            done(null, {
              key: key,
              value: value
            });
          }
        }
      });
    };

    var opts2 = extend({}, opts);
    opts2.keys = opts2.values = true;
    idb.createReadStream(opts2).pipe(tr);

    return tr;
  };

  return secondary;
}
