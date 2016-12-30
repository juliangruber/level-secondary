# level-secondary

Secondary indexes for leveldb.

[![build status](https://secure.travis-ci.org/juliangruber/level-secondary.png)](http://travis-ci.org/juliangruber/level-secondary)

## Example

Create 2 indexes on top of a posts database.

```js
var level = require('level');
var Secondary = require('level-secondary');
var sub = require('level-sublevel');

var db = sub(level(__dirname + '/db', {
  valueEncoding: 'json'
}));

var posts = db.sublevel('posts');

// add a title index
posts.byTitle = Secondary(posts, db.sublevel('title'), 'title');

// add a length index
// append the post.id for unique indexes with possibly overlapping values
posts.byLength = Secondary(posts, db.sublevel('length'), function(post){
  return post.body.length + '!' + post.id;
});

posts.put('1337', {
  id: '1337',
  title: 'a title',
  body: 'lorem ipsum'
}, function(err) {
  if (err) throw err;

  posts.byTitle.get('a title', function(err, post) {
    if (err) throw err;
    console.log('get', post);
    // => get: { id: '1337', title: 'a title', body: 'lorem ipsum' }

    posts.del('1337', function(err) {
      if (err) throw err;
      posts.byTitle.get('a title', function(err) {
        console.log(err.name);
        // => NotFoundError
      });
    });
  });

  posts.byLength.createReadStream({
    start: 10,
    end: 20
  }).on('data', console.log.bind(console, 'read'));
  // => read { key: '1337', value: { id: '1337', title: 'a title', body: 'lorem ipsum' } }

  posts.byLength.createKeyStream({
    start: 10,
    end: 20
  }).on('data', console.log.bind(console, 'key'));
  // => key 1337

  posts.byLength.createValueStream({
    start: 10,
    end: 20
  }).on('data', console.log.bind(console, 'value'));
  // => value { id: '1337', title: 'a title', body: 'lorem ipsum' }
});
```

Same arrangement as above, but using a separate index level and [subleveldown](https://github.com/mafintosh/subleveldown) instead of [level-sublevel](https://github.com/dominictarr/level-sublevel).

```js
var level = require('level');
var Secondary = require('level-secondary');
var sub = require('subleveldown');

var db = level(__dirname + '/db');
var idb = level(__dirname + '/idb');

var posts = sub(db, 'posts', { valueEncoding: 'json' });

// add a title index
posts.byTitle = Secondary(posts, sub(idb, 'title', { valueEncoding: 'json' }), 'title');

// add a length index
// append the post.id for unique indexes with possibly overlapping values
posts.byLength = Secondary(posts, sub(idb, 'length', { valueEncoding: 'json' }), function(post){
  return post.body.length + '!' + post.id;
});
```

## API

### Secondary(db, idb[, reduce])

Takes any level as `db` and any level as `idb` to use as a secondary index that either indexes a property name if `reduce` is a string or uses a custom `reduce` function to map values to indexes.  The level that gets passed as `db` gets mutated by [`dominictarr/level-hooks`](https://github.com/dominictarr/level-hooks) in order to capture db events.  Secondary returns a wrapped `idb` level that helps prune old index values.

### Secondary#get(key, opts[, cb])

Get the value that has been indexed with `key`.

### Secondary#create{Key,Value,Read}Stream(opts)

Create a readable stream that has indexes as keys and indexed data as values.

### Secondary#manifest

A [level manifest](https://github.com/dominictarr/level-manifest) that you can pass to [multilevel](https://github.com/juliangruber/multilevel).

## Breaking changes

### 2.0.0

You are now in charge of creating isolated levels for indexes yourself now.  This allows for greater flexibility on key and value encodings, and lets you separate out storage locations, as well as use other `sublevel` solutions.

What used to be

```js
var level = require('level');
var Secondary = require('level-secondary');
var sub = require('level-sublevel');

var db = sub(level(__dirname + '/db', {
  valueEncoding: 'json'
}));

var posts = db.sublevel('posts');

posts.byTitle = Secondary(posts, 'title');
posts.byLength = Secondary(posts, 'length', function(post){
  return post.body.length + '!' + post.id;
});
```

is now

```js
var level = require('level');
var Secondary = require('level-secondary');
var sub = require('level-sublevel');

var db = sub(level(__dirname + '/db', {
  valueEncoding: 'json'
}));

var posts = db.sublevel('posts');

posts.byTitle = Secondary(posts, db.sublevel('title'), 'title');
posts.byLength = Secondary(posts, db.sublevel('length'), function(post){
  return post.body.length + '!' + post.id;
});
```

### 1.0.0

What used to be

```js
db = Secondary('name', db);
```

is now

```js
db.byName = Secondary(db, 'name');
```

Also hooks are used, so it works perfectly with batches across multiple
sublevels.

## Installation

With [npm](https://npmjs.org) do:

```bash
npm install level-secondary
```

## License

(MIT)

Copyright (c) 2013 Julian Gruber &lt;julian@juliangruber.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
