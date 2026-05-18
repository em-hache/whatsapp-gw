import type { Client, Message } from 'whatsapp-web.js';
export declare function createMockClient(): jest.Mocked<Pick<Client, 'sendMessage'>>;
export declare function createMockMessage(overrides?: Partial<{
    from: string;
    body: string;
    type: string;
    downloadMedia: () => Promise<any>;
}>): jest.Mocked<Pick<Message, 'from' | 'body' | 'type' | 'downloadMedia'>>;
//# sourceMappingURL=whatsapp-client.mock.d.ts.map