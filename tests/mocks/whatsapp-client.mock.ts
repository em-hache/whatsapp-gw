import type { Client, Message } from 'whatsapp-web.js';

export function createMockClient(): jest.Mocked<Pick<Client, 'sendMessage'>> {
    return {
        sendMessage: jest.fn().mockResolvedValue(undefined),
    };
}

export function createMockMessage(overrides: Partial<{
    from: string;
    body: string;
    type: string;
    downloadMedia: () => Promise<any>;
}>= {}): jest.Mocked<Pick<Message, 'from' | 'body' | 'type' | 'downloadMedia'>> {
    return {
        from: overrides.from ?? '5491155556666@c.us',
        body: overrides.body ?? 'Hello world',
        type: (overrides.type ?? 'chat') as any,
        downloadMedia: jest.fn(overrides.downloadMedia ?? (async () => ({
            data: Buffer.from('fake-audio-data').toString('base64'),
            mimetype: 'audio/ogg',
        }))),
    } as any;
}
