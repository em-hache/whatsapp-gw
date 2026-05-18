import {Client, PollVote} from 'whatsapp-web.js';
import {processResponse, ApiResponse} from "../outgoing/conversation_response";
import {generateServiceToken} from "../utils/jwt";


export async function processPollEvent(client: Client, vote: PollVote, mainServiceUrl: string, jwtSecretKey: string){

    console.log('Poll event received from ', vote.voter);

    if (vote.selectedOptions.length != 1){
        return
    }

    const token = generateServiceToken(jwtSecretKey);

    await fetch(`${mainServiceUrl}/api/conversation/textmessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
