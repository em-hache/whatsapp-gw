import dlState from './state-2-dl.js';
import {Session, SessionState} from "../../sessions/session-manager";
import {FlowHandler} from "../flow-handler";
import {UserInput} from "../flow-state";

class CommunityMessagingFlow implements FlowHandler {
    name = 'community-messaging';

    async start(client: any, session: Session): Promise<void> {
        await dlState.enter(client, session);
    }

    async handleInput(client: any, session: Session, input: UserInput): Promise<void> {
        await session.sessionContext.getFlowState().execute(client, session, input);
    }

}

export default new CommunityMessagingFlow();
