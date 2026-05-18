import {Client, Message, MessageTypes} from 'whatsapp-web.js';
import {processResponse, ApiResponse} from "../outgoing/conversation_response";
import {generateServiceToken} from "../utils/jwt";

export async function processMessage(client: Client, message: Message, mainServiceUrl: string, jwtSecretKey: string) {
    if (message.type === MessageTypes.AUDIO || message.type === MessageTypes.VOICE) {
        return processAudioMessage(client, message, mainServiceUrl, jwtSecretKey);
    } else if (message.type === MessageTypes.TEXT) {
        return processTextMessage(client, message, mainServiceUrl, jwtSecretKey);
    } else if (message.type === MessageTypes.IMAGE) {
        return;
    }
}

async function processAudioMessage(client: Client, message: Message, mainServiceUrl: string, jwtSecretKey: string) {
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

    const token = generateServiceToken(jwtSecretKey);

    await fetch(`${mainServiceUrl}/api/conversation/audiomessage`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: form,
    }).then(function(response) {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    }).then(function(responseBody: ApiResponse) {
        processResponse(client, message.from, responseBody);
    }).catch(function(error) {
        console.error('Error sending audio message:', error);
    });
    return;
}

async function processTextMessage(client: Client, message: Message, mainServiceUrl: string, jwtSecretKey: string) {
    console.log('Text message received from', message.from);

    const token = generateServiceToken(jwtSecretKey);

    await fetch(`${mainServiceUrl}/api/conversation/textmessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: message.body, sender: message.from }),
    }).then(function(response) {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    }).then(function(responseBody: ApiResponse) {
        processResponse(client, message.from, responseBody);
    }).catch(function(error) {
        console.error('Error sending text message:', error);
    });
    return;
}
