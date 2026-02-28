import {Session, SessionType} from "../sessions/session-manager";
import {Poll, PollVote} from "whatsapp-web.js";

export enum UserInputType{
    TEXT = 'text',
    POLL = 'poll',
    AUDIO = 'audio',
    FILE = 'file',
}

export abstract class UserInput {
    inputType: UserInputType;

    protected constructor(inputType: UserInputType) {
        this.inputType = inputType;
    }

    abstract getContent(): string;
}

export class TextInput extends UserInput {
    text: string;

    constructor(text: string) {
        super(UserInputType.TEXT);
        this.text = text;
    }

    getContent(): string {
        return this.text;
    }
}

export class PollInput extends UserInput {
    pollVote: PollVote;

    constructor(pollVote: PollVote) {
        super(UserInputType.TEXT);
        this.pollVote = pollVote;
    }

    getContent(): string {
        // @ts-ignore
        return this.pollVote.selectedOptions[0].name;
    }
}

export interface FlowState {
    name: string;
    enter(client: any, session: Session): Promise<void>;
    execute(client: any, session: Session, input: UserInput): Promise<void>;
}

