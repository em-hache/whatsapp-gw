import {Client, LocalAuth, Message, MessageTypes, Poll, PollVote} from 'whatsapp-web.js';
import {processResponse, ApiResponse} from "../outgoing/response";


export async function processPollEvent(client: Client, vote: PollVote){

    console.log('Poll event received from ', vote.voter);

    if (vote.selectedOptions.length != 1){
        return
    }

    await fetch('http://localhost:8000/api/conversation/textmessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // @ts-ignore
        body: JSON.stringify({ message: vote.selectedOptions[0].name, sender: vote.voter }),
    }).then(function(response) {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    }).then(function(responseBody: ApiResponse) {
        processResponse(client, vote.voter, responseBody);
    }).catch(function(error) {
        console.error('Error sending poll vote message:', error);
    });
}
