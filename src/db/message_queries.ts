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

export async function claimPendingBatch(
    pool: pg.Pool,
    batchSize: number,
    minSendIntervalMs: number,
    backoffMs: number
): Promise<OutboxRow[]> {
    const result = await pool.query<OutboxRow>(
        `WITH candidates AS MATERIALIZED (
            SELECT DISTINCT ON (recipient_phone) id, created_at
            FROM message_outbox
            WHERE status = 'pending'
              AND (processed_at IS NULL OR processed_at <= NOW() - make_interval(secs => $3 / 1000.0))
              AND recipient_phone NOT IN (
                  SELECT recipient_phone FROM message_outbox
                  WHERE status = 'sent'
                    AND completed_at > NOW() - make_interval(secs => $2 / 1000.0)
              )
            ORDER BY recipient_phone, created_at ASC
        ),
        locked AS (
            SELECT mo.id FROM message_outbox mo
            JOIN candidates c ON mo.id = c.id
            ORDER BY c.created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        )
        UPDATE message_outbox
        SET status = 'processing', processed_at = NOW()
        WHERE id IN (SELECT id FROM locked)
        RETURNING *`,
        [batchSize, minSendIntervalMs, backoffMs]
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
