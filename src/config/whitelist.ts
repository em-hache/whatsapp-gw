const whitelist = new Set([
    "34620159453@c.us",
    "34665844228@c.us",
    "34679508894@c.us",
    "34654566515@c.us",
    "265089810694252@lid"
]);

export function isAllowed(id: string): boolean {
    return whitelist.has(id);
}
