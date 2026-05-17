import { claimPendingBatch, markSent, markFailed, resetStaleProcessing } from '../../src/db/message_queries';

describe('Database Queries', () => {
    let mockPool: { query: jest.Mock };

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        mockPool = { query: jest.fn() };
    });

    describe('claimPendingBatch', () => {
        it('should execute query with correct parameters', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await claimPendingBatch(mockPool as any, 10, 3600000, 3600000);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const [sql, params] = mockPool.query.mock.calls[0]!;
            expect(params).toEqual([10, 3600000, 3600000]);
        });

        it('should use FOR UPDATE SKIP LOCKED in the query', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await claimPendingBatch(mockPool as any, 5, 1000, 2000);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain('FOR UPDATE SKIP LOCKED');
        });

        it('should use DISTINCT ON recipient_phone for deduplication', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await claimPendingBatch(mockPool as any, 5, 1000, 2000);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain('DISTINCT ON (recipient_phone)');
        });

        it('should set status to processing in the UPDATE', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await claimPendingBatch(mockPool as any, 5, 1000, 2000);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain("SET status = 'processing'");
        });

        it('should filter by pending status', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await claimPendingBatch(mockPool as any, 5, 1000, 2000);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain("status = 'pending'");
        });

        it('should exclude recipients who were recently sent a message', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await claimPendingBatch(mockPool as any, 5, 3600000, 1000);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain("status = 'sent'");
            expect(sql).toContain('completed_at');
        });

        it('should return rows from query result', async () => {
            const expectedRows = [
                { id: 1, recipient_phone: '123@c.us', message_body: 'Test', status: 'processing' },
                { id: 2, recipient_phone: '456@c.us', message_body: 'Test2', status: 'processing' },
            ];
            mockPool.query.mockResolvedValue({ rows: expectedRows });

            const result = await claimPendingBatch(mockPool as any, 10, 1000, 1000);

            expect(result).toEqual(expectedRows);
        });

        it('should use LIMIT with batchSize parameter', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await claimPendingBatch(mockPool as any, 25, 1000, 2000);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain('LIMIT $1');
            expect(mockPool.query.mock.calls[0]![1][0]).toBe(25);
        });

        it('should use backoff to exclude recently processed messages', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await claimPendingBatch(mockPool as any, 5, 1000, 60000);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain('processed_at');
            expect(sql).toContain('$3');
            expect(mockPool.query.mock.calls[0]![1][2]).toBe(60000);
        });
    });

    describe('markSent', () => {
        it('should update status to sent with correct id', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 1 });

            await markSent(mockPool as any, 42);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const [sql, params] = mockPool.query.mock.calls[0]!;
            expect(sql).toContain("status = 'sent'");
            expect(sql).toContain('completed_at = NOW()');
            expect(sql).toContain('attempt_count = attempt_count + 1');
            expect(params).toEqual([42]);
        });
    });

    describe('markFailed', () => {
        it('should update with error message and check max retries', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 1 });

            await markFailed(mockPool as any, 7, 'Connection timeout', 3);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const [sql, params] = mockPool.query.mock.calls[0]!;
            expect(sql).toContain('error_message = $2');
            expect(sql).toContain('attempt_count + 1 >= $3');
            expect(params).toEqual([7, 'Connection timeout', 3]);
        });

        it('should set status to failed when max retries exceeded', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 1 });

            await markFailed(mockPool as any, 1, 'Error', 3);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain("'failed'");
            expect(sql).toContain("'pending'");
        });

        it('should set completed_at only when max retries reached', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 1 });

            await markFailed(mockPool as any, 1, 'Error', 5);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain('completed_at = CASE');
        });
    });

    describe('resetStaleProcessing', () => {
        it('should reset processing messages back to pending', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 2 });

            await resetStaleProcessing(mockPool as any);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain("SET status = 'pending'");
            expect(sql).toContain("WHERE status = 'processing'");
        });

        it('should set processed_at to NULL', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 0 });

            await resetStaleProcessing(mockPool as any);

            const sql = mockPool.query.mock.calls[0]![0] as string;
            expect(sql).toContain('processed_at = NULL');
        });

        it('should not log when no rows are reset', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            mockPool.query.mockResolvedValue({ rowCount: 0 });

            await resetStaleProcessing(mockPool as any);

            // The function checks rowCount > 0 before logging
            expect(consoleSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('Reset')
            );
        });

        it('should log count when rows are reset', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            mockPool.query.mockResolvedValue({ rowCount: 5 });

            await resetStaleProcessing(mockPool as any);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('5')
            );
        });
    });
});
