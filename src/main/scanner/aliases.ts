function isAlias(value: unknown): value is VariableAlias {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'VARIABLE_ALIAS' &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}

/** Все привязки переменных на ноде — по всем свойствам, не только по заливке. */
export function allAliases(node: SceneNode): readonly VariableAlias[] {
  if (!('boundVariables' in node)) return [];
  const bound: unknown = node.boundVariables;
  if (bound === undefined || bound === null) return [];

  const result: VariableAlias[] = [];
  for (const value of Object.values(bound as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const item of value) if (isAlias(item)) result.push(item);
    } else if (isAlias(value)) {
      result.push(value);
    } else if (typeof value === 'object' && value !== null) {
      // componentProperties — словарь alias по имени свойства.
      for (const alias of Object.values(value)) if (isAlias(alias)) result.push(alias);
    }
  }
  return result;
}
