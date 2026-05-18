export interface MockPool {
    query: jest.Mock;
}
export declare function createMockPool(queryResult?: {
    rows: any[];
    rowCount: number;
}): MockPool;
export declare function createOutboxRows(count: number, overrides?: Partial<{
    status: string;
    recipient_phone: string;
    message_body: string;
}>): Array<{
    id: number;
    recipient_phone: string;
    message_body: string;
    status: string;
    attempt_count: number;
    error_message: string | null;
    created_at: Date;
    processed_at: Date | null;
    completed_at: Date | null;
}>;
//# sourceMappingURL=postgres.mock.d.ts.map