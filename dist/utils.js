export function groupIntoPairs(arr) {
    const grouped = [];
    for (let i = 0; i < arr.length; i += 2) {
        grouped.push(arr.slice(i, i + 2));
    }
    return grouped;
}
export function safeUppercase(string) {
    if (!string)
        return '';
    return string.toUpperCase();
}
