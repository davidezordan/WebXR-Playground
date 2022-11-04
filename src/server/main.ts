import path from 'path';
import express from 'express';
import http from 'http';

const PORT = process.env.PORT || 3000;
const HTML_FOLDER = '../dist';
const INDEX = path.join(__dirname, HTML_FOLDER, 'index.html');

// define routes and socket
const app = express();
app.get('/', function(req, res) { res.sendFile(INDEX); });
const staticAssetsHandler = express.static(path.join(__dirname, HTML_FOLDER));
app.use('/', staticAssetsHandler);

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});