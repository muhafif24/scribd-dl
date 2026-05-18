import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './src/App.js';
import { configLoader } from './src/utils/io/ConfigLoader.js';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const OUTPUT_DIR = configLoader.load("DIRECTORY", "output") || 'output';

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // API: Live download progress stream (Server-Sent Events)
    if (pathname === '/api/download') {
        const urlParam = parsedUrl.searchParams.get('url');
        if (!urlParam) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'URL parameter is required' }));
            return;
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        // Helper to send SSE event
        const sendEvent = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        try {
            console.log(`[GUI] Starting download for: ${urlParam}`);
            await app.execute(urlParam, (progress) => {
                sendEvent(progress);
            });
        } catch (err) {
            console.error('[GUI] Download Error:', err);
            sendEvent({ status: 'error', message: err.message });
        } finally {
            res.end();
        }
        return;
    }

    // API: Download the actual generated PDF file
    if (pathname === '/api/download-file') {
        const filename = parsedUrl.searchParams.get('name');
        if (!filename) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Filename is required');
            return;
        }

        const safeFilename = path.basename(filename);
        const filePath = path.join(__dirname, OUTPUT_DIR, safeFilename);

        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': stat.size,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFilename)}"`
            });
            const readStream = fs.createReadStream(filePath);
            readStream.pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        }
        return;
    }

    // Static files serving
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    
    // Security check: ensure path is within public folder
    const publicDir = path.join(__dirname, 'public');
    if (!filePath.startsWith(publicDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    const localUrl = `http://localhost:${PORT}`;
    console.log(`[GUI] Server running at ${localUrl}`);
    console.log(`[GUI] Press Ctrl+C to stop the server`);
    
    // Automatically open the browser on Windows
    exec(`start ${localUrl}`, (err) => {
        if (err) {
            console.log(`[GUI] Please open ${localUrl} manually in your browser.`);
        }
    });
});
