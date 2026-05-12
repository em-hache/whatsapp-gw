import http from 'http';
import fs from 'fs';
import { getQrImagePath, isAuthenticated } from './storage.js';

let server: http.Server | null = null;

export function startQrServer(port: number): void {
    server = http.createServer((req, res) => {
        if (req.method === 'GET' && req.url === '/qr') {
            console.log('Request for a QR')
            if (isAuthenticated()) {
                res.writeHead(204);
                res.end();
                return;
            }
            const qrPath = getQrImagePath();
            if (fs.existsSync(qrPath)) {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                fs.createReadStream(qrPath).pipe(res);
            } else {
                res.writeHead(204);
                res.end();
            }
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(port, () => {
        console.log(`QR server listening on port ${port}`);
    });
}

export function stopQrServer(): void {
    if (server) {
        server.close();
        server = null;
    }
}
