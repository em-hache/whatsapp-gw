import {Client, LocalAuth, Message, MessageTypes, PollVote} from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { isAllowed } from './config/whitelist.js';
import { getSession, createSession, deleteSession } from './sessions/session-manager.js';
import { startNewFlow, handlePollVote, handleMessage } from './flows/flow-starter';

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

    if (message.type === MessageTypes.AUDIO || message.type === MessageTypes.VOICE) {
        return processAudioMessage(message);
    } else if (message.type === MessageTypes.TEXT) {
        return processTextMessage(message);
    } else if (message.type === MessageTypes.IMAGE) {
        return;
    }
});

client.on('poll_vote', async (vote: PollVote) => {
    console.log('Poll vote received from ', vote.voter);

    const form = new FormData();
    form.append('question', vote.parentMessage.body);
    // @ts-ignore
    form.append('selected', vote.selectedOptions[0].name);
    form.append('sender', vote.voter);
    await fetch('http://localhost:8000/api/conversation/option-selected', {
        method: 'POST',
        body: form,
    }).then(function(response) {
        return response.text();
    }).then(function(text) {
        console.log(text);
        client.sendMessage(vote.voter, text);
    });
    return;
});

async function processAudioMessage(message: Message) {
    console.log('Audio message received from', message.from);

    let media;
    for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        media = await message.downloadMedia();
        if (media?.data?.length > 0) break;
        console.log(`downloadMedia attempt ${attempt + 1} returned empty, retrying...`);
    }
    if (!media?.data?.length) {
        console.log('Failed to download audio after 5 attempts');
        return;
    }
    const audioBuffer = Buffer.from(media.data, 'base64');
    const extension = media.mimetype.split('/')[1] ?? 'ogg';
    console.log('Audio mimetype:', media.mimetype, '| buffer bytes:', audioBuffer.length);
    const file = new File([audioBuffer], `audio.${extension}`, { type: media.mimetype });

    const form = new FormData();
    form.append('audio', file);
    form.append('sender', message.from);

    await fetch('http://localhost:8000/api/conversation/message', {
        method: 'POST',
        body: form,
    }).then(function(response) {
        return response.text();
    }).then(function(text) {
        console.log(text);
        client.sendMessage(message.from, text);
    });
    return;
}

async function processTextMessage(message: Message) {
    console.log('Text message received from', message.from);

    const form = new FormData();
    form.append('message', message.body);
    form.append('sender', message.from);

    await fetch('http://localhost:8000/api/conversation/message', {
        method: 'POST',
        body: form,
    }).then(function(response) {
        return response.text();
    }).then(function(text) {
        console.log(text);
        client.sendMessage(message.from, text);
    });
    return;
}

client.initialize();
