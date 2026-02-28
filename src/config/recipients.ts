const recipients = new Map<string, string>([
    ["34620159453@c.us", "Elena"],
    ["34629789924@c.us", "César"],
    ["46730790303@c.us", "David"],
]);

export function getName(senderId: string): string | null {
    return recipients.get(senderId) || null;
}
