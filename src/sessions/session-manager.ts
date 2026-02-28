import {FlowState} from "../flows/flow-state";

const sessions = new Map<string, Session>();

export enum SessionState {
    AWAITING_SELECTION = 'awaiting_selection',
    IN_PROGRESS = 'session_active',
    IDLE_SUCCESS = 'session_finished_correctly',
    IDLE_CANCELLED = 'session_finished_cancelled',
}

export enum SessionType {
    NOT_SET = 'NOT_SET',
    GENERAL_MESSAGE = 'GENERAL_MESSAGE',
    OTHER = 'OTHER',
}

class SessionContext {
    private recipients: Set<string> = new Set();
    private textContentVersions: string[] = [];
    private flowState!: FlowState;

    addRecipient(recipientId: string) {
        this.recipients.add(recipientId);
    }

    addRecipients(recipients: string[]) {
        recipients.map(r => this.recipients.add(r));
    }

    getRecipients(): Set<string> {
        return this.recipients;
    }

    addTextContentVersion(value: string) {
        this.textContentVersions.push(value);
    }

    getLatestTextContent(): string | undefined {
        return this.textContentVersions[this.textContentVersions.length - 1];
    }

    getTextContentVersions(): string[] {
        return this.textContentVersions;
    }

    transitionFlowState(flowState: FlowState) {
        this.flowState = flowState;
    }

    getFlowState() {
        return this.flowState;
    }

}

export interface Session {
    senderId: string;
    createdAt: number;
    state: SessionState | null;
    type: 'NOT_SET' | 'GENERAL_MESSAGE' | 'OTHER';
    sessionContext: SessionContext;
}

export function getSession(senderId: string): Session | null {
    return sessions.get(senderId) || null;
}

export function createSession(senderId: string): Session {
    const session: Session = {
        senderId: senderId,
        createdAt: Date.now(),
        state: SessionState.AWAITING_SELECTION,
        type: SessionType.NOT_SET,
        sessionContext: new SessionContext(),
    };
    sessions.set(senderId, session);
    console.log('Session created for', senderId);
    return session;
}

export function deleteSession(senderId: string): void {
    sessions.delete(senderId);
    console.log('Session deleted for', senderId);
}
