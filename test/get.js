var level = require('memdb');
var Secondary = require('..');
var sub = require('level-sublevel');
var test = require('tape');

test('get', function(t) {
  t.plan(5);
  var db = sub(level({ valueEncoding: 'json' }));
  var index = {
    title: db.sublevel('title'),
    len: db.sublevel('length')
  }

  var posts = db.sublevel('posts');
  posts.byTitle = Secondary(posts, index.title, 'title');
  posts.byLength = Secondary(posts, index.len, function(post){
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
      posts.byLength.get(post.body.length, function(err, _post) {
        t.error(err)
        t.deepEqual(_post, post)
      })
    });
  });
});

