import {getName} from '../config/recipients.js';
import {Client, Message, Poll, PollVote} from 'whatsapp-web.js';
import communityMessaging from './community-messaging/index.js';
import {createSession, deleteSession, Session, SessionState, SessionType} from "../sessions/session-manager";
import {FlowHandler} from "./flow-handler";
import {PollInput, TextInput} from "./flow-state";

const FLOW_OPTIONS = [
    'Mensaje a la comunidad',
    'Otros...'
];

function getFlowHandler(type: string): FlowHandler | null {
    switch (type) {
        case SessionType.GENERAL_MESSAGE:
            return communityMessaging;
        default:
            return null;
    }
}

export async function startNewFlow(client: Client, session: Session): Promise<void> {
    console.log('Starting flow for', session.senderId);
    const messageContent = 'Hola, ' + getName(session.senderId) + '. ¿Qué vamos a hacer?';
    const poll = new Poll(messageContent, FLOW_OPTIONS, {
        allowMultipleAnswers: false,
        messageSecret: undefined,
    });
    await client.sendMessage(session.senderId, poll);
}

export async function handleMessage(client: Client, session: Session, message: Message): Promise<void> {

    if (message.body.trim() === 'Cancela') {
        session.state = SessionState.IDLE_CANCELLED;
        deleteSession(session.senderId);
        console.log('Sesión cancelada por el usuario: ', session.senderId);
        return;
    }

    const flowHandler = getFlowHandler(session.type);
    if (flowHandler) {
        await flowHandler.handleInput(client, session, new TextInput(message.body));
    } else {
        deleteSession(session.senderId);
        console.log('Error general.');
    }
}

export async function handlePollVote(client: Client, session: Session, vote: PollVote): Promise<void> {
    if (session.type !== 'NOT_SET') {
        await getFlowHandler(session.type)!.handleInput(client, session, new PollInput(vote));
        return;
    }

    const selected = vote.selectedOptions.map((o: any) => o.name);
    console.log('Initial poll answer from', session.senderId, ':', selected);

    if (selected.includes(FLOW_OPTIONS[0])) {
        session.type = SessionType.GENERAL_MESSAGE;
    } else if (selected.includes(FLOW_OPTIONS[1])) {
        session.type = SessionType.OTHER;
    } else {
        await client.sendMessage(session.senderId, 'Opción no reconocida.');
        deleteSession(session.senderId);
        return;
    }

    const flowHandler = getFlowHandler(session.type);
    if (flowHandler) {
        session.state = SessionState.IN_PROGRESS;
        await flowHandler.start(client, session);
    } else {
        await client.sendMessage(session.senderId, 'Este flujo aún no está disponible.');
    }
}
