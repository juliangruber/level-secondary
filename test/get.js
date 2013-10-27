var level = require('memdb');
var Secondary = require('..');
var sub = require('level-sublevel');
var test = require('tape');

test('get', function(t) {
  t.plan(3);
  var db = sub(level({ valueEncoding: 'json' }));

  var posts = db.sublevel('posts');
  posts.byTitle = Secondary(posts, 'title');
  posts.byLength = Secondary(posts, 'length', function(post){
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
    });
  });
});

