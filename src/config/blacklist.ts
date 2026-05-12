const blacklist = new Set([
    "xxx@lid",
]);

export function isBlacklisted(id: string): boolean {
    return blacklist.has(id);
}
