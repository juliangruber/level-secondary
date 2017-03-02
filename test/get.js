var level = require('memdb');
var Secondary = require('..');
var sub = require('level-sublevel');
var test = require('tape');

test('get', function(t) {
  t.plan(7);
  var db = sub(level({ valueEncoding: 'json' }));

  var posts = db.sublevel('posts');
  posts.byTitle = Secondary(posts, 'title');
  posts.byLength = Secondary(posts, 'length', function(post){
    return post.body.length;
  });
  posts.byKeyHead = Secondary(posts, 'keyhead', function(post,key){
    return key[0];
  });
  posts.byPartialIndex = Secondary(posts, 'partial', function(post){
    return post.title === 'a title' ? null : post.title ;
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
      posts.byKeyHead.get('1', function(err, _post) {
        t.error(err);
        t.deepEqual(_post, post);
        posts.byPartialIndex.get('a title', function(err, _post) {
          t.ok(err);
          t.ok(err.notFound);
        });
      });
    });
  });
});
