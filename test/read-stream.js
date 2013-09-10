var level = require('level-test')();
var Secondary = require('..');
var sub = require('level-sublevel');
var test = require('tape');

test('read streams', function(t) {
  t.plan(4);
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

    posts.byLength.createReadStream({
      start: 10,
      end: 20
    }).on('data', function(data) {
      t.deepEqual(data, {
        key: '1337',
        value: post
      });
    });

    posts.byLength.createKeyStream({
      start: 10,
      end: 20
    }).on('data', function(data) {
      t.equal(data, '1337');
    });

    posts.byLength.createValueStream({
      start: 10,
      end: 20
    }).on('data', function(data) {
      t.deepEqual(data, post);
    });
  });
});

