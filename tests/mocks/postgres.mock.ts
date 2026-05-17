import type pg from 'pg';

export interface MockPool {
    query: jest.Mock;
}

export function createMockPool(queryResult?: { rows: any[]; rowCount: number }): MockPool {
    return {
        query: jest.fn().mockResolvedValue(queryResult ?? { rows: [], rowCount: 0 }),
    };
}

export function createOutboxRows(count: number, overrides: Partial<{
    status: string;
    recipient_phone: string;
    message_body: string;
}> = {}): Array<{
    id: number;
    recipient_phone: string;
    message_body: string;
    status: string;
    attempt_count: number;
    error_message: string | null;
    created_at: Date;
    processed_at: Date | null;
    completed_at: Date | null;
}> {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        recipient_phone: overrides.recipient_phone ?? `549115555${1000 + i}@c.us`,
        message_body: overrides.message_body ?? `Test message ${i + 1}`,
        status: overrides.status ?? 'processing',
        attempt_count: 0,
        error_message: null,
        created_at: new Date(),
        processed_at: new Date(),
        completed_at: null,
    }));
}
