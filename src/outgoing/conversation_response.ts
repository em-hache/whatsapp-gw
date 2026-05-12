import {Client, Poll} from "whatsapp-web.js";

export type ApiResponse =
    | { reply_type: "text"; reply: string }
    | { reply_type: "poll"; reply: string; poll_options: string[] }
    | { reply_type: "review"; reply: string; poll_options: string[]; crafted_message: string };

export async function processResponse(client: Client, recipient: string, responseBody: ApiResponse) {
    if (responseBody.reply_type === "text") {
        await client.sendMessage(recipient, responseBody.reply);
    } else if (responseBody.reply_type === "poll") {
        const poll = new Poll(responseBody.reply, responseBody.poll_options, {
            allowMultipleAnswers: false,
            messageSecret: undefined,
        });
        await client.sendMessage(recipient, poll);
    } else if (responseBody.reply_type === "review") {
        await client.sendMessage(recipient, responseBody.crafted_message);
        const poll = new Poll(responseBody.reply, responseBody.poll_options, {
            allowMultipleAnswers: false,
            messageSecret: undefined,
        });
        await client.sendMessage(recipient, poll);
    }
}
