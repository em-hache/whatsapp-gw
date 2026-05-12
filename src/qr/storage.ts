import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

const STORAGE_DIR = path.resolve(__dirname, '../../storage');
const QR_IMAGE_PATH = path.join(STORAGE_DIR, 'qr.png');

let authenticated = false;

export async function saveQrImage(qrString: string): Promise<void> {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    await QRCode.toFile(QR_IMAGE_PATH, qrString);
}

export function clearQrImage(): void {
    authenticated = true;
    if (fs.existsSync(QR_IMAGE_PATH)) {
        fs.unlinkSync(QR_IMAGE_PATH);
    }
}

export function isAuthenticated(): boolean {
    return authenticated;
}

export function getQrImagePath(): string {
    return QR_IMAGE_PATH;
}
