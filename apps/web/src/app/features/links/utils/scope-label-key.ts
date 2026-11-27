/** The Transloco key of a library scope's name (`library.scope.all`, `.unsorted`, `.favorites`, `.folder`). */
export function scopeLabelKey(scope: string): string {
  return `library.scope.${scope}`;
}
