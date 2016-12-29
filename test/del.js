var level = require('memdb');
var Secondary = require('..');
var sub = require('level-sublevel');
var test = require('tape');

test('del', function(t) {
  t.plan(5);
  var db = sub(level({ valueEncoding: 'json' }));
  var idb = db.sublevel('title')

  var posts = db.sublevel('posts');
  posts.byTitle = Secondary(posts, idb, 'title');

  posts.put('1337', {
    title: 'a title',
    body: 'lorem ipsum'
  }, function(err) {
    t.error(err);

    posts.del('1337', function(err) {
      t.error(err);

      posts.byTitle.get('a title', function(err) {
        t.ok(err);
        t.ok(err.notFound);

        posts.byTitle.createReadStream()
        .on('data', function() {
          t.fail();
        })
        .on('end', function() {
          t.ok(true);
        });
      });
    });
  });
});

