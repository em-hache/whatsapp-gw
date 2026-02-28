import {FlowHandler} from "../flow-handler";
import {Session, SessionState} from "../../sessions/session-manager";
import {UserInput} from "../flow-state";

class OtherFlow implements FlowHandler {
    name = 'other';

    async start(client: any, session: Session): Promise<void> {
        await client.sendMessage(session.senderId, 'Pues nada, vamos a charlar.');
        session.state = SessionState.IDLE_SUCCESS;
    }

    async handleInput(client: any, session: Session, input: UserInput): Promise<void> {
        // TODO: process the community message
    }
}

export default new OtherFlow();
