import { processMessage } from '../../src/incoming/conversation_message';
import { createMockClient, createMockMessage } from '../mocks/whatsapp-client.mock';
import { MessageTypes } from 'whatsapp-web.js';

// Mock the conversation_response module
jest.mock('../../src/outgoing/conversation_response', () => ({
    processResponse: jest.fn(),
}));
import { processResponse } from '../../src/outgoing/conversation_response';
const mockedProcessResponse = processResponse as jest.MockedFunction<typeof processResponse>;

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('processMessage', () => {
    let mockClient: ReturnType<typeof createMockClient>;
    const mainServiceUrl = 'http://localhost:8000';

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        mockClient = createMockClient();
        mockFetch.mockReset();
        mockedProcessResponse.mockReset();
    });

    describe('Text Messages', () => {
        it('should send text message to main service API', async () => {
            const message = createMockMessage({
                type: MessageTypes.TEXT,
                body: 'Hola!',
                from: '5491155551234@c.us',
            });

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ reply_type: 'text', reply: 'Respuesta' }),
            } as Response);

            await processMessage(mockClient as any, message as any, mainServiceUrl);

            expect(mockFetch).toHaveBeenCalledWith(
                `${mainServiceUrl}/api/conversation/textmessage`,
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Hola!', sender: '5491155551234@c.us' }),
                })
            );
        });

        it('should call processResponse with API response', async () => {
            const message = createMockMessage({ type: MessageTypes.TEXT });
            const apiResponse = { reply_type: 'text' as const, reply: 'OK' };

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => apiResponse,
            } as Response);

            await processMessage(mockClient as any, message as any, mainServiceUrl);

            expect(mockedProcessResponse).toHaveBeenCalledWith(
                mockClient,
                message.from,
                apiResponse
            );
        });

        it('should handle HTTP error responses', async () => {
            const message = createMockMessage({ type: MessageTypes.TEXT });

            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            } as Response);

            await processMessage(mockClient as any, message as any, mainServiceUrl);

            expect(mockedProcessResponse).not.toHaveBeenCalled();
        });

        it('should handle network errors gracefully', async () => {
            const message = createMockMessage({ type: MessageTypes.TEXT });

            mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

            await processMessage(mockClient as any, message as any, mainServiceUrl);

            expect(mockedProcessResponse).not.toHaveBeenCalled();
        });
    });

    describe('Audio Messages', () => {
        it('should download media and send to audio endpoint', async () => {
            const audioData = Buffer.from('fake-audio-content').toString('base64');
            const message = createMockMessage({
                type: MessageTypes.AUDIO,
                from: '5491155559999@c.us',
                downloadMedia: async () => ({
                    data: audioData,
                    mimetype: 'audio/ogg',
                }),
            });

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ reply_type: 'text', reply: 'Transcribed' }),
            } as Response);

            await processMessage(mockClient as any, message as any, mainServiceUrl);

            expect(message.downloadMedia).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledWith(
                `${mainServiceUrl}/api/conversation/audiomessage`,
                expect.objectContaining({
                    method: 'POST',
                })
            );

            // Verify FormData was sent
            const callArgs = mockFetch.mock.calls[0]!;
            const body = callArgs[1]!.body as FormData;
            expect(body).toBeInstanceOf(FormData);
        });

        it('should handle VOICE message type same as AUDIO', async () => {
            const message = createMockMessage({
                type: MessageTypes.VOICE,
            });

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ reply_type: 'text', reply: 'OK' }),
            } as Response);

            await processMessage(mockClient as any, message as any, mainServiceUrl);

            expect(message.downloadMedia).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledWith(
                `${mainServiceUrl}/api/conversation/audiomessage`,
                expect.anything()
            );
        });

        it('should retry downloadMedia up to 5 times', async () => {
            jest.useFakeTimers();

            const message = createMockMessage({
                type: MessageTypes.AUDIO,
                downloadMedia: jest.fn()
                    .mockResolvedValueOnce({ data: '', mimetype: 'audio/ogg' })
                    .mockResolvedValueOnce({ data: '', mimetype: 'audio/ogg' })
                    .mockResolvedValueOnce({ data: Buffer.from('audio').toString('base64'), mimetype: 'audio/ogg' }) as any,
            });

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ reply_type: 'text', reply: 'OK' }),
            } as Response);

            const promise = processMessage(mockClient as any, message as any, mainServiceUrl);
            await jest.advanceTimersByTimeAsync(15000);
            await promise;

            expect(message.downloadMedia).toHaveBeenCalledTimes(3);
            expect(mockFetch).toHaveBeenCalled();

            jest.useRealTimers();
        });

        it('should abort if media download fails after all retries', async () => {
            jest.useFakeTimers();

            const message = createMockMessage({
                type: MessageTypes.AUDIO,
                downloadMedia: jest.fn().mockResolvedValue({ data: '', mimetype: 'audio/ogg' }) as any,
            });

            const promise = processMessage(mockClient as any, message as any, mainServiceUrl);
            await jest.advanceTimersByTimeAsync(15000);
            await promise;

            expect(message.downloadMedia).toHaveBeenCalledTimes(5);
            expect(mockFetch).not.toHaveBeenCalled();

            jest.useRealTimers();
        });
    });

    describe('Unsupported Message Types', () => {
        it('should ignore IMAGE messages', async () => {
            const message = createMockMessage({ type: MessageTypes.IMAGE });

            await processMessage(mockClient as any, message as any, mainServiceUrl);

            expect(mockFetch).not.toHaveBeenCalled();
        });
    });
});
