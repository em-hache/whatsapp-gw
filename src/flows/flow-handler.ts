import {Session} from "../sessions/session-manager";
import {UserInput} from "./flow-state";

export interface FlowHandler {
    name: string;
    start(client: any, session: Session): Promise<void>;
    handleInput(client: any, session: Session, input: UserInput): Promise<void>;
}

