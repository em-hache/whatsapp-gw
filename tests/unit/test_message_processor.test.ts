import { startMessageOutboxProcessor } from '../../src/outgoing/message_processor';
import { createMockClient } from '../mocks/whatsapp-client.mock';
import { createMockPool, createOutboxRows } from '../mocks/postgres.mock';
import type { MessageOutboxConfig } from '../../src/config/env';

// Mock the db module
jest.mock('../../src/db/message_queries');
import { claimPendingBatch, markSent, markFailed } from '../../src/db/message_queries';

const mockedClaimPendingBatch = claimPendingBatch as jest.MockedFunction<typeof claimPendingBatch>;
const mockedMarkSent = markSent as jest.MockedFunction<typeof markSent>;
const mockedMarkFailed = markFailed as jest.MockedFunction<typeof markFailed>;

describe('Message Outbox Processor', () => {
    let mockClient: ReturnType<typeof createMockClient>;
    let mockPool: ReturnType<typeof createMockPool>;
    let config: MessageOutboxConfig;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        mockClient = createMockClient();
        mockPool = createMockPool();
        config = {
            db: { host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test' },
            pollIntervalMs: 1000,
            batchSize: 10,
            sendDelayMs: 100,
            maxRetries: 3,
            minSendIntervalMs: 3600000,
            backoffMs: 3600000,
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should start polling after pollIntervalMs', () => {
        mockedClaimPendingBatch.mockResolvedValue([]);

        startMessageOutboxProcessor(mockClient as any, mockPool as any, config);

        expect(mockedClaimPendingBatch).not.toHaveBeenCalled();

        jest.advanceTimersByTime(config.pollIntervalMs);

        // The poll function was scheduled
        expect(mockedClaimPendingBatch).toHaveBeenCalledTimes(1);
    });

    it('should claim pending batch with correct parameters', async () => {
        mockedClaimPendingBatch.mockResolvedValue([]);

        startMessageOutboxProcessor(mockClient as any, mockPool as any, config);
        jest.advanceTimersByTime(config.pollIntervalMs);

        await Promise.resolve(); // flush microtasks

        expect(mockedClaimPendingBatch).toHaveBeenCalledWith(
            mockPool,
            config.batchSize,
            config.minSendIntervalMs,
            config.backoffMs
        );
    });

    it('should send messages and mark them as sent', async () => {
        const rows = createOutboxRows(2);
        mockedClaimPendingBatch.mockResolvedValue(rows);
        mockedMarkSent.mockResolvedValue(undefined);

        startMessageOutboxProcessor(mockClient as any, mockPool as any, config);
        jest.advanceTimersByTime(config.pollIntervalMs);

        // Flush all async work
        await jest.advanceTimersByTimeAsync(config.sendDelayMs * 2);

        expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);
        expect(mockClient.sendMessage).toHaveBeenCalledWith(rows[0]!.recipient_phone, rows[0]!.message_body);
        expect(mockClient.sendMessage).toHaveBeenCalledWith(rows[1]!.recipient_phone, rows[1]!.message_body);
        expect(mockedMarkSent).toHaveBeenCalledTimes(2);
        expect(mockedMarkSent).toHaveBeenCalledWith(mockPool, rows[0]!.id);
        expect(mockedMarkSent).toHaveBeenCalledWith(mockPool, rows[1]!.id);
    });

    it('should mark message as failed when sendMessage throws', async () => {
        const rows = createOutboxRows(1);
        mockedClaimPendingBatch.mockResolvedValue(rows);
        mockClient.sendMessage.mockRejectedValue(new Error('Connection timeout'));
        mockedMarkFailed.mockResolvedValue(undefined);

        startMessageOutboxProcessor(mockClient as any, mockPool as any, config);
        jest.advanceTimersByTime(config.pollIntervalMs);

        await jest.advanceTimersByTimeAsync(100);

        expect(mockedMarkFailed).toHaveBeenCalledWith(
            mockPool,
            rows[0]!.id,
            'Connection timeout',
            config.maxRetries
        );
    });

    it('should continue processing remaining messages after one fails', async () => {
        const rows = createOutboxRows(3);
        mockedClaimPendingBatch.mockResolvedValue(rows);
        mockedMarkSent.mockResolvedValue(undefined);
        mockedMarkFailed.mockResolvedValue(undefined);

        mockClient.sendMessage
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('Failed'))
            .mockResolvedValueOnce(undefined);

        startMessageOutboxProcessor(mockClient as any, mockPool as any, config);
        jest.advanceTimersByTime(config.pollIntervalMs);

        await jest.advanceTimersByTimeAsync(config.sendDelayMs * 3);

        expect(mockClient.sendMessage).toHaveBeenCalledTimes(3);
        expect(mockedMarkSent).toHaveBeenCalledTimes(2);
        expect(mockedMarkFailed).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in claimPendingBatch gracefully', async () => {
        mockedClaimPendingBatch.mockRejectedValue(new Error('DB connection lost'));

        startMessageOutboxProcessor(mockClient as any, mockPool as any, config);
        jest.advanceTimersByTime(config.pollIntervalMs);

        await jest.advanceTimersByTimeAsync(100);

        // Should not throw, processor continues
        expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should delay between messages with sendDelayMs', async () => {
        const rows = createOutboxRows(2);
        mockedClaimPendingBatch.mockResolvedValue(rows);
        mockedMarkSent.mockResolvedValue(undefined);

        startMessageOutboxProcessor(mockClient as any, mockPool as any, config);
        jest.advanceTimersByTime(config.pollIntervalMs);

        // After first message sends immediately
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);

        // After delay, second message sends
        await jest.advanceTimersByTimeAsync(config.sendDelayMs);

        expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should schedule next poll after current cycle completes', async () => {
        mockedClaimPendingBatch.mockResolvedValue([]);

        startMessageOutboxProcessor(mockClient as any, mockPool as any, config);

        // First poll
        jest.advanceTimersByTime(config.pollIntervalMs);
        await jest.advanceTimersByTimeAsync(100);

        // Second poll
        jest.advanceTimersByTime(config.pollIntervalMs);
        await jest.advanceTimersByTimeAsync(100);

        expect(mockedClaimPendingBatch).toHaveBeenCalledTimes(2);
    });
});
