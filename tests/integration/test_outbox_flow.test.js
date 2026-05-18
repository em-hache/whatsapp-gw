"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const message_processor_1 = require("../../src/outgoing/message_processor");
const whatsapp_client_mock_1 = require("../mocks/whatsapp-client.mock");
const postgres_mock_1 = require("../mocks/postgres.mock");
// Mock the db module to simulate full flow
jest.mock('../../src/db/message_queries');
const message_queries_1 = require("../../src/db/message_queries");
const mockedClaimPendingBatch = message_queries_1.claimPendingBatch;
const mockedMarkSent = message_queries_1.markSent;
const mockedMarkFailed = message_queries_1.markFailed;
describe('Outbox Flow Integration', () => {
    let mockClient;
    let mockPool;
    let config;
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockClient = (0, whatsapp_client_mock_1.createMockClient)();
        mockPool = { query: jest.fn() };
        config = {
            db: { host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test' },
            pollIntervalMs: 500,
            batchSize: 5,
            sendDelayMs: 100,
            maxRetries: 3,
            minSendIntervalMs: 3600000,
            backoffMs: 3600000,
        };
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    describe('Claim -> Send -> Update Status (happy path)', () => {
        it('should complete full lifecycle: claim, send, mark sent', async () => {
            const rows = (0, postgres_mock_1.createOutboxRows)(3);
            mockedClaimPendingBatch.mockResolvedValue(rows);
            mockedMarkSent.mockResolvedValue(undefined);
            (0, message_processor_1.startMessageOutboxProcessor)(mockClient, mockPool, config);
            // Trigger first poll
            await jest.advanceTimersByTimeAsync(config.pollIntervalMs);
            // Wait for all sends + delays
            await jest.advanceTimersByTimeAsync(config.sendDelayMs * rows.length);
            // All messages claimed
            expect(mockedClaimPendingBatch).toHaveBeenCalledTimes(1);
            // All messages sent via WhatsApp
            expect(mockClient.sendMessage).toHaveBeenCalledTimes(3);
            for (const row of rows) {
                expect(mockClient.sendMessage).toHaveBeenCalledWith(row.recipient_phone, row.message_body);
            }
            // All messages marked as sent in DB
            expect(mockedMarkSent).toHaveBeenCalledTimes(3);
            for (const row of rows) {
                expect(mockedMarkSent).toHaveBeenCalledWith(mockPool, row.id);
            }
        });
    });
    describe('Partial failure scenario', () => {
        it('should mark failed messages and continue with remaining', async () => {
            const rows = (0, postgres_mock_1.createOutboxRows)(4);
            mockedClaimPendingBatch.mockResolvedValue(rows);
            mockedMarkSent.mockResolvedValue(undefined);
            mockedMarkFailed.mockResolvedValue(undefined);
            // Second and fourth messages fail
            mockClient.sendMessage
                .mockResolvedValueOnce(undefined) // msg 1: success
                .mockRejectedValueOnce(new Error('Rate limited')) // msg 2: fail
                .mockResolvedValueOnce(undefined) // msg 3: success
                .mockRejectedValueOnce(new Error('Recipient not found')); // msg 4: fail
            (0, message_processor_1.startMessageOutboxProcessor)(mockClient, mockPool, config);
            await jest.advanceTimersByTimeAsync(config.pollIntervalMs + config.sendDelayMs * 5);
            expect(mockedMarkSent).toHaveBeenCalledTimes(2);
            expect(mockedMarkSent).toHaveBeenCalledWith(mockPool, rows[0].id);
            expect(mockedMarkSent).toHaveBeenCalledWith(mockPool, rows[2].id);
            expect(mockedMarkFailed).toHaveBeenCalledTimes(2);
            expect(mockedMarkFailed).toHaveBeenCalledWith(mockPool, rows[1].id, 'Rate limited', config.maxRetries);
            expect(mockedMarkFailed).toHaveBeenCalledWith(mockPool, rows[3].id, 'Recipient not found', config.maxRetries);
        });
    });
    describe('Empty batch scenario', () => {
        it('should handle empty batch and continue polling', async () => {
            mockedClaimPendingBatch
                .mockResolvedValueOnce([]) // First poll: empty
                .mockResolvedValueOnce((0, postgres_mock_1.createOutboxRows)(1)); // Second poll: has work
            mockedMarkSent.mockResolvedValue(undefined);
            (0, message_processor_1.startMessageOutboxProcessor)(mockClient, mockPool, config);
            // First poll - empty
            await jest.advanceTimersByTimeAsync(config.pollIntervalMs);
            expect(mockClient.sendMessage).not.toHaveBeenCalled();
            // Second poll - has message
            await jest.advanceTimersByTimeAsync(config.pollIntervalMs + 200);
            expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
        });
    });
    describe('Database error recovery', () => {
        it('should recover and continue polling after DB error', async () => {
            const rows = (0, postgres_mock_1.createOutboxRows)(1);
            mockedClaimPendingBatch
                .mockRejectedValueOnce(new Error('Connection refused'))
                .mockResolvedValueOnce(rows);
            mockedMarkSent.mockResolvedValue(undefined);
            (0, message_processor_1.startMessageOutboxProcessor)(mockClient, mockPool, config);
            // First poll fails
            await jest.advanceTimersByTimeAsync(config.pollIntervalMs + 100);
            expect(mockClient.sendMessage).not.toHaveBeenCalled();
            // Second poll succeeds
            await jest.advanceTimersByTimeAsync(config.pollIntervalMs + 100);
            expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
            expect(mockedMarkSent).toHaveBeenCalledTimes(1);
        });
    });
    describe('Multiple poll cycles', () => {
        it('should process multiple batches across poll cycles', async () => {
            const batch1 = (0, postgres_mock_1.createOutboxRows)(2);
            const batch2 = (0, postgres_mock_1.createOutboxRows)(2).map((r, i) => ({ ...r, id: 10 + i }));
            mockedClaimPendingBatch
                .mockResolvedValueOnce(batch1)
                .mockResolvedValueOnce(batch2);
            mockedMarkSent.mockResolvedValue(undefined);
            (0, message_processor_1.startMessageOutboxProcessor)(mockClient, mockPool, config);
            // Process first batch
            await jest.advanceTimersByTimeAsync(config.pollIntervalMs + config.sendDelayMs * 3);
            // Process second batch
            await jest.advanceTimersByTimeAsync(config.pollIntervalMs + config.sendDelayMs * 3);
            expect(mockClient.sendMessage).toHaveBeenCalledTimes(4);
            expect(mockedMarkSent).toHaveBeenCalledTimes(4);
        });
    });
});
//# sourceMappingURL=test_outbox_flow.test.js.map