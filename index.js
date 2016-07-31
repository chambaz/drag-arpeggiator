const http = require('http');
const st = require('st');

const static = st({
	path: 'browser',
	index: 'index.html'
});

const server = http.createServer((req, res) => {
	static(req, res);
	return;
});

server.listen(3030, () => {
	console.log("Server listening on: http://localhost:3030");
});
