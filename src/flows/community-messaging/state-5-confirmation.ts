import {deleteSession, Session, SessionState} from "../../sessions/session-manager";
import {FlowState, UserInput} from "../flow-state";

class ConfirmationState implements FlowState {
    name: string = "confirmation";

    async enter(client: any, session: Session): Promise<void> {
        session.sessionContext.transitionFlowState(this);
        await client.sendMessage(session.senderId, "Message sent to " + session.sessionContext.getRecipients().size);
        session.state = SessionState.IDLE_SUCCESS;
        deleteSession(session.senderId);
    }
    async execute(client: any, session: Session, input: UserInput): Promise<void> {
        throw new Error("Method not implemented.");
    }

}

export default new ConfirmationState();
