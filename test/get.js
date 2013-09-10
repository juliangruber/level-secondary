var level = require('level-test')();
var Secondary = require('..');
var sub = require('level-sublevel');
var test = require('tape');

test('get', function(t) {
  t.plan(6);
  var db = sub(level('db', { valueEncoding: 'json' }));

  var posts = db.sublevel('posts');
  posts = Secondary('title', posts);
  posts = Secondary('length', posts, function(post){
    return post.body.length;
  });

  var post = {
    title: 'a title',
    body: 'lorem ipsum'
  };

  posts.put('1337', post, function(err) {
    t.error(err);

    posts.byTitle.get('a title', function(err, _post) {
      t.error(err);
      t.deepEqual(_post, post);

      posts.del('1337', function(err) {
        t.error(err);
        posts.byTitle.get('a title', function(err) {
          t.ok(err);
          t.equal(err.name, 'NotFoundError');
        });
      });
    });
  });
});

