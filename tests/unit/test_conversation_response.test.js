"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const conversation_response_1 = require("../../src/outgoing/conversation_response");
const whatsapp_client_mock_1 = require("../mocks/whatsapp-client.mock");
// Mock the Poll constructor from whatsapp-web.js
jest.mock('whatsapp-web.js', () => ({
    Poll: jest.fn().mockImplementation((name, options, config) => ({
        _type: 'poll',
        name,
        options,
        config,
    })),
}));
describe('processResponse', () => {
    let mockClient;
    const recipient = '5491155556666@c.us';
    beforeEach(() => {
        mockClient = (0, whatsapp_client_mock_1.createMockClient)();
    });
    describe('Text Reply', () => {
        it('should send a text message to the recipient', async () => {
            const response = {
                reply_type: 'text',
                reply: 'Hello from the bot!',
            };
            await (0, conversation_response_1.processResponse)(mockClient, recipient, response);
            expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
            expect(mockClient.sendMessage).toHaveBeenCalledWith(recipient, 'Hello from the bot!');
        });
        it('should handle empty text reply', async () => {
            const response = {
                reply_type: 'text',
                reply: '',
            };
            await (0, conversation_response_1.processResponse)(mockClient, recipient, response);
            expect(mockClient.sendMessage).toHaveBeenCalledWith(recipient, '');
        });
    });
    describe('Poll Reply', () => {
        it('should create and send a Poll message', async () => {
            const response = {
                reply_type: 'poll',
                reply: 'What do you prefer?',
                poll_options: ['Option A', 'Option B', 'Option C'],
            };
            await (0, conversation_response_1.processResponse)(mockClient, recipient, response);
            expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
            const sentPoll = mockClient.sendMessage.mock.calls[0][1];
            expect(sentPoll).toEqual(expect.objectContaining({
                _type: 'poll',
                name: 'What do you prefer?',
                options: ['Option A', 'Option B', 'Option C'],
                config: { allowMultipleAnswers: false, messageSecret: undefined },
            }));
        });
    });
    describe('Review Reply', () => {
        it('should send crafted message first, then poll', async () => {
            const response = {
                reply_type: 'review',
                reply: 'Is this correct?',
                poll_options: ['Yes', 'No'],
                crafted_message: 'Here is the draft message for review.',
            };
            await (0, conversation_response_1.processResponse)(mockClient, recipient, response);
            expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);
            // First call: crafted message
            expect(mockClient.sendMessage.mock.calls[0]).toEqual([
                recipient,
                'Here is the draft message for review.',
            ]);
            // Second call: poll
            const sentPoll = mockClient.sendMessage.mock.calls[1][1];
            expect(sentPoll).toEqual(expect.objectContaining({
                _type: 'poll',
                name: 'Is this correct?',
                options: ['Yes', 'No'],
            }));
        });
        it('should send messages in order (crafted before poll)', async () => {
            const callOrder = [];
            mockClient.sendMessage.mockImplementation(async (_recipient, content) => {
                if (typeof content === 'string') {
                    callOrder.push('text');
                }
                else {
                    callOrder.push('poll');
                }
                return undefined;
            });
            const response = {
                reply_type: 'review',
                reply: 'Approve?',
                poll_options: ['Approve', 'Reject'],
                crafted_message: 'Draft content here.',
            };
            await (0, conversation_response_1.processResponse)(mockClient, recipient, response);
            expect(callOrder).toEqual(['text', 'poll']);
        });
    });
    describe('Error Handling', () => {
        it('should propagate sendMessage errors', async () => {
            mockClient.sendMessage.mockRejectedValue(new Error('Not connected'));
            const response = {
                reply_type: 'text',
                reply: 'Test',
            };
            await expect((0, conversation_response_1.processResponse)(mockClient, recipient, response)).rejects.toThrow('Not connected');
        });
    });
});
//# sourceMappingURL=test_conversation_response.test.js.map