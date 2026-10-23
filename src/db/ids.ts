/**
 * A new row id: the moment in base 36 and eight random characters. Unique on one phone, which is
 * all a local database needs; sortable by creation time as a bonus.
 */
export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
