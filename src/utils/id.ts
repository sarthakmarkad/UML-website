let counter = 0;

/** Collision-safe enough for a client side editor, and readable while debugging. */
export function createId(prefix = 'id'): string {
  counter += 1;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${time}${counter.toString(36)}${random}`;
}
