/** Покрытие видимых SOLID-заливок, независимо от размера и других привязок. */
export type FillBindings =
  { readonly kind: 'none' | 'raw' } | { readonly kind: 'bound'; readonly ids: readonly string[] };

export function fillBindings(node: SceneNode): FillBindings {
  if (
    !node.visible ||
    ('opacity' in node && node.opacity === 0) ||
    !('fills' in node) ||
    !Array.isArray(node.fills)
  ) {
    return { kind: 'none' };
  }
  const paints = (node.fills as readonly Paint[]).filter(
    (paint): paint is SolidPaint =>
      paint.type === 'SOLID' && paint.visible !== false && paint.opacity !== 0,
  );
  if (paints.length === 0) return { kind: 'none' };
  const ids: string[] = [];
  for (const paint of paints) {
    const alias = paint.boundVariables?.color;
    if (alias === undefined) return { kind: 'raw' };
    ids.push(alias.id);
  }
  return { kind: 'bound', ids };
}
