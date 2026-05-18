import http from 'http';
import fs from 'fs';
import { getQrImagePath, isAuthenticated } from './storage.js';
import { validateJwtToken } from '../middleware/auth.js';

let server: http.Server | null = null;

export function startQrServer(port: number, jwtSecret: string): void {
    server = http.createServer((req, res) => {
        if (req.method === 'GET' && req.url === '/qr') {
            console.log('Request for a QR');

            const authResult = validateJwtToken(req, jwtSecret);

            if (!authResult.success) {
                console.log('JWT validation failed:', authResult.error);
                res.writeHead(authResult.statusCode || 401, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    error: authResult.error
                }));
                return;
            }

            console.log('Authenticated user:', authResult.user?.sub);

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
