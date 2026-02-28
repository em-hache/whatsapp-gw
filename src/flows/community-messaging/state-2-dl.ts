import {FlowState, UserInput} from "../flow-state";
import {Session} from "../../sessions/session-manager";
import {Poll} from "whatsapp-web.js";
import state3ContentsInput from "./state-3-contents-input";


class DlState implements FlowState {
    name = 'dl';
    LISTS = [
        'Una',
        'Dos'
    ];

    async enter(client: any, session: Session): Promise<void> {
        session.sessionContext.transitionFlowState(this);
        const poll = new Poll("Distribution List?", this.LISTS, {
            allowMultipleAnswers: false,
            messageSecret: undefined,
        });
        await client.sendMessage(session.senderId, poll);
    }

    async execute(client: any, session: Session, input: UserInput): Promise<void> {
        input.getContent();
        session.sessionContext.addRecipient("34620159453@c.us");
        await state3ContentsInput.enter(client, session);
    }
}

export default new DlState();
