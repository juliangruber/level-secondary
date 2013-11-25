var level = require('memdb');
var Secondary = require('..');
var sub = require('level-sublevel');
var test = require('tape');
var multilevel = require('multilevel');

test('multilevel', function(t) {
	t.plan(3);
	
	var db = sub(level({ valueEncoding: 'json' }));
	var byTitle = Secondary(db, 'title');
	var server = multilevel.server(byTitle);
	var client = multilevel.client(byTitle.manifest);

	server.pipe(client.createRpcStream()).pipe(server);

	var post = {
		title: 'a title',
		body: 'lorem ipsum'
	};

	db.put('1337', post, function(err) {
		t.error(err);

		client.get('a title', function(err, _post) {
			t.error(err);
			t.deepEqual(_post, post);
		});
	});
});

