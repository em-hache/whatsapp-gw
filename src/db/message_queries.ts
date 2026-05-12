import pg from 'pg';

export interface OutboxRow {
    id: number;
    recipient_phone: string;
    message_body: string;
    status: string;
    attempt_count: number;
    error_message: string | null;
    created_at: Date;
    processed_at: Date | null;
    completed_at: Date | null;
}

export async function claimPendingBatch(pool: pg.Pool, batchSize: number): Promise<OutboxRow[]> {
    const result = await pool.query<OutboxRow>(
        `UPDATE message_outbox SET status = 'processing', processed_at = NOW()
         WHERE id IN (
             SELECT id FROM message_outbox WHERE status = 'pending'
             ORDER BY created_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED
         ) RETURNING *`,
        [batchSize]
    );
    return result.rows;
}

export async function markSent(pool: pg.Pool, id: number): Promise<void> {
    await pool.query(
        `UPDATE message_outbox
         SET status = 'sent', completed_at = NOW(), attempt_count = attempt_count + 1
         WHERE id = $1`,
        [id]
    );
}

export async function markFailed(
    pool: pg.Pool,
    id: number,
    errorMsg: string,
    maxRetries: number
): Promise<void> {
    await pool.query(
        `UPDATE message_outbox
         SET attempt_count = attempt_count + 1,
             error_message = $2,
             status = CASE WHEN attempt_count + 1 >= $3 THEN 'failed' ELSE 'pending' END,
             completed_at = CASE WHEN attempt_count + 1 >= $3 THEN NOW() ELSE NULL END
         WHERE id = $1`,
        [id, errorMsg, maxRetries]
    );
}

export async function resetStaleProcessing(pool: pg.Pool): Promise<void> {
    const result = await pool.query(
        `UPDATE message_outbox SET status = 'pending', processed_at = NULL
         WHERE status = 'processing'`
    );
    if (result.rowCount && result.rowCount > 0) {
        console.log(`Reset ${result.rowCount} stale processing message(s) back to pending.`);
    }
}
