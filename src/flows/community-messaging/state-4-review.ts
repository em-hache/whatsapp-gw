import { Session } from "../../sessions/session-manager";
import {FlowState, UserInput} from "../flow-state";
import {Poll} from "whatsapp-web.js";
import state3ContentsInput from "./state-3-contents-input";
import state5Confirmation from "./state-5-confirmation";
import state6Cancellation from "./state-6-cancellation";


class ReviewState implements FlowState {
    name = 'review';

    async enter(client: any, session: Session): Promise<void> {
        session.sessionContext.transitionFlowState(this);
        const poll = new Poll("¿Te parece bien?", ['Sí', 'No', 'Cancelar'], {
            allowMultipleAnswers: false,
            messageSecret: undefined,
        });
        await client.sendMessage(session.senderId, poll);
    }

    async execute(client: any, session: Session, input: UserInput): Promise<void> {
        input.getContent();
        if (input.getContent() === "Sí") {
            session.sessionContext.getRecipients().forEach(recipient => {
                client.sendMessage(recipient, session.sessionContext.getLatestTextContent());
            })
            await state5Confirmation.enter(client, session);
        } else if (input.getContent() === "No") {
            await state3ContentsInput.enter(client, session);
        } else {
            await state6Cancellation.enter(client, session);
        }
    }

}

export default new ReviewState();
