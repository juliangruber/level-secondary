var extend = require('xtend');
var Transform = require('stream').Transform
  || require('readable-stream').Transform;

module.exports = Secondary;

function Secondary(db, name, reduce) {
  var sub = db.sublevel(name);

  if (!reduce) {
    reduce = function(value) {
      return value[name];
    };
  }

  db.pre(function(change, add) {
    if (change.type != 'put') return;

    add({
      type: 'put',
      key: reduce(change.value,change.key),
      value: change.key,
      prefix: sub
    });
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

      sub.get(key, function(err, value) {
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
          sub.del(key, done);
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
    sub.createReadStream(opts2).pipe(tr);

    return tr;
  };

  return secondary;
}
