/** A folder name as a comparison key: accents removed, lower case, spaces collapsed. */
export function normalizeFolderKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}
