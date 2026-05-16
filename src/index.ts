import {Client, LocalAuth, Message, PollVote} from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { isBlacklisted } from './config/blacklist';
import { processMessage } from './incoming/conversation_message';
import { processPollEvent } from './incoming/conversation_poll';
import { loadAppConfig, loadMessageOutboxConfig } from './config/env.js';
import { createPool, closePool } from './db/connection_pool';
import { resetStaleProcessing } from './db/message_queries';
import { startMessageOutboxProcessor } from './outgoing/message_processor';
import { saveQrImage, clearQrImage, resetAuthentication } from './qr/storage.js';
import { startQrServer, stopQrServer } from './qr/server.js';

const appConfig = loadAppConfig();
const messageOutboxConfig = loadMessageOutboxConfig();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

client.on('qr', (qr: string) => {
    resetAuthentication();
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above to log in.');
    saveQrImage(qr).catch((err: unknown) => console.error('Failed to save QR image:', err));
});

let readyTimestampSec: number | null = null;
let readyTimestampMs: number | null = null;

client.on('ready', async () => {
    readyTimestampSec = Math.floor(Date.now() / 1000);
    readyTimestampMs = Date.now();
    clearQrImage();
    console.log('WhatsApp client is ready.');

    if (messageOutboxConfig) {
        const pool = createPool(messageOutboxConfig.db);
        await resetStaleProcessing(pool);
        startMessageOutboxProcessor(client, pool, messageOutboxConfig);
    } else {
        console.log('Outbox processor skipped (DB_NAME, DB_USER, or DB_PASSWORD not set).');
    }
});

client.on('disconnected', (reason: string) => {
    console.log('Client disconnected:', reason);
});

client.on('message', async (message: Message) => {
    if (readyTimestampSec === null || message.timestamp < readyTimestampSec) return;

    if (isBlacklisted(message.from)) {
        console.log('Not processing message from blacklisted id:', message.from);
        return;
    }
    await processMessage(client, message, appConfig.mainServiceUrl);
});

client.on('vote_update', async (vote: PollVote) => {
    if (readyTimestampMs === null || vote.interractedAtTs < readyTimestampMs) return;

    if (isBlacklisted(vote.voter)) {
        console.log('Not processing poll event from blacklisted id:', vote.voter);
        return;
    }
    console.log('Poll vote received from ', vote.voter);

    await processPollEvent(client, vote, appConfig.mainServiceUrl);
});

async function shutdown() {
    console.log('Shutting down...');
    stopQrServer();
    await closePool();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startQrServer(3000);

client.initialize().catch((error) => {
    console.error('Failed to initialize WhatsApp client:', error);
    process.exit(1);
});
