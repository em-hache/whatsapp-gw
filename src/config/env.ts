import {Message} from "whatsapp-web.js";

export interface AppConfig {
    mainServiceUrl: string;
}

export function loadAppConfig(): AppConfig {
    return {
        mainServiceUrl: process.env['MAIN_SERVICE_URL'] ?? 'http://localhost:8000',
    };
}

export interface MessageOutboxConfig {
    db: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
    pollIntervalMs: number;
    batchSize: number;
    sendDelayMs: number;
    maxRetries: number;
    minSendIntervalMs: number;
    backoffMs: number;
}

export function loadMessageOutboxConfig(): MessageOutboxConfig | null {
    const dbName = process.env['DB_NAME'];
    const dbUser = process.env['DB_USER'];
    const dbPassword = process.env['DB_PASSWORD'];

    if (!dbName || !dbUser || !dbPassword) {
        return null;
    }

    return {
        db: {
            host: process.env['DB_HOST'] ?? 'localhost',
            port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
            database: dbName,
            user: dbUser,
            password: dbPassword,
        },
        pollIntervalMs: parseInt(process.env['OUTBOX_POLL_INTERVAL_MS'] ?? '5000', 10),
        batchSize: parseInt(process.env['OUTBOX_BATCH_SIZE'] ?? '10', 10),
        sendDelayMs: parseInt(process.env['OUTBOX_SEND_DELAY_MS'] ?? '5000', 10),
        maxRetries: parseInt(process.env['OUTBOX_MAX_RETRIES'] ?? '3', 10),
        minSendIntervalMs: parseInt(process.env['OUTBOX_MIN_SEND_INTERVAL_MS'] ?? '3600000', 10),
        backoffMs: parseInt(process.env['OUTBOX_BACKOFF_MS'] ?? '3600000', 10),
    };
}
