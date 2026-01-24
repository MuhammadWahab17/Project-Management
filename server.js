// Server startup file for cPanel/Namecheap
// Application startup file: server.js

const next = require('next');
const http = require('http');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = false; // Always production mode in cPanel

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http.createServer((req, res) => {
    handle(req, res);
  }).listen(port, '0.0.0.0', () => {
    console.log(`> Next.js server ready on port ${port}`);
  });
});
