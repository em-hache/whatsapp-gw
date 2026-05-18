"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const conversation_message_1 = require("../../src/incoming/conversation_message");
const whatsapp_client_mock_1 = require("../mocks/whatsapp-client.mock");
const whatsapp_web_js_1 = require("whatsapp-web.js");
// Mock the conversation_response module
jest.mock('../../src/outgoing/conversation_response', () => ({
    processResponse: jest.fn(),
}));
const conversation_response_1 = require("../../src/outgoing/conversation_response");
const mockedProcessResponse = conversation_response_1.processResponse;
// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;
describe('processMessage', () => {
    let mockClient;
    const mainServiceUrl = 'http://localhost:8000';
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockClient = (0, whatsapp_client_mock_1.createMockClient)();
        mockFetch.mockReset();
        mockedProcessResponse.mockReset();
    });
    describe('Text Messages', () => {
        it('should send text message to main service API', async () => {
            const message = (0, whatsapp_client_mock_1.createMockMessage)({
                type: whatsapp_web_js_1.MessageTypes.TEXT,
                body: 'Hola!',
                from: '5491155551234@c.us',
            });
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ reply_type: 'text', reply: 'Respuesta' }),
            });
            await (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            expect(mockFetch).toHaveBeenCalledWith(`${mainServiceUrl}/api/conversation/textmessage`, expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Hola!', sender: '5491155551234@c.us' }),
            }));
        });
        it('should call processResponse with API response', async () => {
            const message = (0, whatsapp_client_mock_1.createMockMessage)({ type: whatsapp_web_js_1.MessageTypes.TEXT });
            const apiResponse = { reply_type: 'text', reply: 'OK' };
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => apiResponse,
            });
            await (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            expect(mockedProcessResponse).toHaveBeenCalledWith(mockClient, message.from, apiResponse);
        });
        it('should handle HTTP error responses', async () => {
            const message = (0, whatsapp_client_mock_1.createMockMessage)({ type: whatsapp_web_js_1.MessageTypes.TEXT });
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });
            await (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            expect(mockedProcessResponse).not.toHaveBeenCalled();
        });
        it('should handle network errors gracefully', async () => {
            const message = (0, whatsapp_client_mock_1.createMockMessage)({ type: whatsapp_web_js_1.MessageTypes.TEXT });
            mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
            await (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            expect(mockedProcessResponse).not.toHaveBeenCalled();
        });
    });
    describe('Audio Messages', () => {
        it('should download media and send to audio endpoint', async () => {
            const audioData = Buffer.from('fake-audio-content').toString('base64');
            const message = (0, whatsapp_client_mock_1.createMockMessage)({
                type: whatsapp_web_js_1.MessageTypes.AUDIO,
                from: '5491155559999@c.us',
                downloadMedia: async () => ({
                    data: audioData,
                    mimetype: 'audio/ogg',
                }),
            });
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ reply_type: 'text', reply: 'Transcribed' }),
            });
            await (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            expect(message.downloadMedia).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledWith(`${mainServiceUrl}/api/conversation/audiomessage`, expect.objectContaining({
                method: 'POST',
            }));
            // Verify FormData was sent
            const callArgs = mockFetch.mock.calls[0];
            const body = callArgs[1].body;
            expect(body).toBeInstanceOf(FormData);
        });
        it('should handle VOICE message type same as AUDIO', async () => {
            const message = (0, whatsapp_client_mock_1.createMockMessage)({
                type: whatsapp_web_js_1.MessageTypes.VOICE,
            });
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ reply_type: 'text', reply: 'OK' }),
            });
            await (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            expect(message.downloadMedia).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledWith(`${mainServiceUrl}/api/conversation/audiomessage`, expect.anything());
        });
        it('should retry downloadMedia up to 5 times', async () => {
            jest.useFakeTimers();
            const message = (0, whatsapp_client_mock_1.createMockMessage)({
                type: whatsapp_web_js_1.MessageTypes.AUDIO,
                downloadMedia: jest.fn()
                    .mockResolvedValueOnce({ data: '', mimetype: 'audio/ogg' })
                    .mockResolvedValueOnce({ data: '', mimetype: 'audio/ogg' })
                    .mockResolvedValueOnce({ data: Buffer.from('audio').toString('base64'), mimetype: 'audio/ogg' }),
            });
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ reply_type: 'text', reply: 'OK' }),
            });
            const promise = (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            await jest.advanceTimersByTimeAsync(15000);
            await promise;
            expect(message.downloadMedia).toHaveBeenCalledTimes(3);
            expect(mockFetch).toHaveBeenCalled();
            jest.useRealTimers();
        });
        it('should abort if media download fails after all retries', async () => {
            jest.useFakeTimers();
            const message = (0, whatsapp_client_mock_1.createMockMessage)({
                type: whatsapp_web_js_1.MessageTypes.AUDIO,
                downloadMedia: jest.fn().mockResolvedValue({ data: '', mimetype: 'audio/ogg' }),
            });
            const promise = (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            await jest.advanceTimersByTimeAsync(15000);
            await promise;
            expect(message.downloadMedia).toHaveBeenCalledTimes(5);
            expect(mockFetch).not.toHaveBeenCalled();
            jest.useRealTimers();
        });
    });
    describe('Unsupported Message Types', () => {
        it('should ignore IMAGE messages', async () => {
            const message = (0, whatsapp_client_mock_1.createMockMessage)({ type: whatsapp_web_js_1.MessageTypes.IMAGE });
            await (0, conversation_message_1.processMessage)(mockClient, message, mainServiceUrl);
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=test_conversation_message.test.js.map