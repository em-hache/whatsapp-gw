import {Client, LocalAuth, Message, PollVote} from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { isAllowed } from './config/whitelist.js';
import { processMessage } from './incoming/message.js';
import { processPollEvent } from './incoming/poll.js';

const client = new Client({
    authStrategy: new LocalAuth(),
});

client.on('qr', (qr: string) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above to log in.');
});

let readyTimestamp: number | null = null;

client.on('ready', () => {
    readyTimestamp = Math.floor(Date.now() / 1000);
    console.log('WhatsApp client is ready.');
});

client.on('disconnected', (reason: string) => {
    console.log('Client disconnected:', reason);
});

client.on('message', async (message: Message) => {
    if (readyTimestamp === null || message.timestamp < readyTimestamp) return;

    if (!isAllowed(message.from)) {
        console.log('Not processing message from non-whitelisted id:', message.from);
        return;
    }
    await processMessage(client, message);
});

client.on('vote_update', async (vote: PollVote) => {
    if (readyTimestamp === null || vote.interractedAtTs < readyTimestamp) return;

    if (!isAllowed(vote.voter)) {
        console.log('Not processing poll event from non-whitelisted id:', vote.voter);
        return;
    }
    console.log('Poll vote received from ', vote.voter);

    await processPollEvent(client, vote);
});

client.initialize().catch((error) => {
    console.error('Failed to initialize WhatsApp client:', error);
    process.exit(1);
});
