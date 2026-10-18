const EXPRESSION = /^\s*\{%([\s\S]*)%\}\s*$/;

/** True when `value` is a JSONata expression wrapped in `{% %}`. */
export function isExpression(value: string): boolean {
  return EXPRESSION.test(value);
}

/**
 * Returns the JSONata source of `value`: the inner expression when wrapped in `{% %}`,
 * otherwise a JSONata string literal of `value`.
 */
export function unwrap(value: string): string {
  const match = EXPRESSION.exec(value);
  return match ? match[1].trim() : JSON.stringify(value);
}

/** Wraps JSONata source in `{% %}`. */
export function wrap(source: string): string {
  return `{% ${source} %}`;
}

/** True when the expression reads the state input (`$states.input`). */
export function readsStateInput(value: string): boolean {
  return /\$states\.input\b/.test(value);
}
