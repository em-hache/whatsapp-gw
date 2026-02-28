import {FlowState, UserInput} from "../flow-state";
import {Session} from "../../sessions/session-manager";

class PromptState implements FlowState {
    name = 'prompt';

    async enter(client: any, session: Session): Promise<void> {
        await client.sendMessage(session.senderId, 'Escribe el mensaje que quieres enviar a la comunidad.');
    }

    async execute(client: any, session: Session, input: UserInput): Promise<void> {
        // TODO: handle user input in prompt state
    }
}

export default new PromptState();
