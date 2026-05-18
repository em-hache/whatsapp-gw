"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockClient = createMockClient;
exports.createMockMessage = createMockMessage;
function createMockClient() {
    return {
        sendMessage: jest.fn().mockResolvedValue(undefined),
    };
}
function createMockMessage(overrides = {}) {
    return {
        from: overrides.from ?? '5491155556666@c.us',
        body: overrides.body ?? 'Hello world',
        type: (overrides.type ?? 'chat'),
        downloadMedia: jest.fn(overrides.downloadMedia ?? (async () => ({
            data: Buffer.from('fake-audio-data').toString('base64'),
            mimetype: 'audio/ogg',
        }))),
    };
}
//# sourceMappingURL=whatsapp-client.mock.js.map