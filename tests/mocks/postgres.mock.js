"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockPool = createMockPool;
exports.createOutboxRows = createOutboxRows;
function createMockPool(queryResult) {
    return {
        query: jest.fn().mockResolvedValue(queryResult ?? { rows: [], rowCount: 0 }),
    };
}
function createOutboxRows(count, overrides = {}) {
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
//# sourceMappingURL=postgres.mock.js.map