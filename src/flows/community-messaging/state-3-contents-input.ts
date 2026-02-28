import {FlowState, UserInput} from "../flow-state";
import {Session} from "../../sessions/session-manager";
import {Poll} from "whatsapp-web.js";
import state4Review from "./state-4-review";


class ContentsInputState implements FlowState {
    name = 'contents-input';
    private message!: string;

    async enter(client: any, session: Session): Promise<void> {
        session.sessionContext.transitionFlowState(this);
        await client.sendMessage(session.senderId, "¿Qué quieres enviar?");
    }

    async execute(client: any, session: Session, input: UserInput): Promise<void> {
        this.message = "Loren ipsum...";
        session.sessionContext.addTextContentVersion(this.message);
        await client.sendMessage(session.senderId, "El mensaje es: \n " + this.message);

        await state4Review.enter(client, session);
    }

}

export default new ContentsInputState();
