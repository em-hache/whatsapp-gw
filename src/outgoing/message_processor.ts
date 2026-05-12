import type {Client} from 'whatsapp-web.js';
import type pg from 'pg';
import type {MessageOutboxConfig} from '../config/env';
import {claimPendingBatch, markSent, markFailed} from '../db/message_queries';

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startMessageOutboxProcessor(client: Client, pool: pg.Pool, config: MessageOutboxConfig): void {
    console.log('Message Outbox processor started.');

    async function poll(): Promise<void> {
        try {
            const rows = await claimPendingBatch(pool, config.batchSize, config.minSendIntervalMs, config.backoffMs);
            if (rows.length > 0) {
                console.log(`Outbox: claimed ${rows.length} message(s) to send.`);
            }

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]!;
                try {
                    await client.sendMessage(row.recipient_phone, row.message_body);
                    await markSent(pool, row.id);
                    console.log(`Outbox: sent message ${row.id} to ${row.recipient_phone}`);
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    await markFailed(pool, row.id, errorMsg, config.maxRetries);
                    console.error(`Outbox: failed to send message ${row.id}:`, errorMsg);
                }

                if (i < rows.length - 1) {
                    await delay(config.sendDelayMs);
                }
            }
        } catch (err) {
            console.error('Outbox: error during poll cycle:', err);
        }

        setTimeout(poll, config.pollIntervalMs);
    }

    setTimeout(poll, config.pollIntervalMs);
}
