import { expect, it } from 'vitest';
import { allAliases } from '../../src/main/scanner/aliases';
import { instance, rectangle, variableAlias } from '../factories/node';
import { VariableUsageIndex } from '../../src/main/analysis/usage';

it('собирает текстовые и булевы свойства компонента вместе с заливкой', () => {
  const node = instance();
  Object.assign(node, {
    boundVariables: {
      fills: [variableAlias('color')],
      componentProperties: { 'label#1': variableAlias('text'), 'show#2': variableAlias('boolean') },
    },
  });
  expect(allAliases(node).map((alias) => alias.id)).toEqual(['color', 'text', 'boolean']);
});

it('пустые привязки не создают зависимости', () => {
  expect(allAliases(rectangle())).toEqual([]);
});

it('несколько свойств с одним токеном не задваивают impact', () => {
  const node = instance();
  Object.assign(node, {
    boundVariables: { componentProperties: { a: variableAlias('v'), b: variableAlias('v') } },
  });
  const usage = new VariableUsageIndex();
  for (const alias of allAliases(node))
    usage.add(alias.id, { nodeId: node.id, pageId: 'p', name: node.name });
  expect(usage.describe(() => ({ name: 'v', collectionName: 'c' }), 10)[0]?.nodes).toBe(1);
});
