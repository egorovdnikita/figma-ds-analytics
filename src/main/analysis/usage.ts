/**
 * Обратный индекс: токен → где он используется.
 *
 * Паспорт называет impact analysis причиной, по которой плагин выберут
 * вместо линтера хардкода: «что сломается, если удалить этот токен» — до
 * рефакторинга, а не после.
 *
 * Индекс собирается прямо во время обхода: список привязок и так проходит
 * через сканер, второй проход по дереву ради него был бы лишним.
 */
import type { Place, VariableUsage } from '../../shared/adoption';

/**
 * Сколько мест помним на токен.
 *
 * Счётчик точный, список — примеры. Хранить все места значит тащить в UI
 * десятки тысяч записей ради списка, который никто не пролистает.
 */
const PLACES_PER_VARIABLE = 12;

interface Entry {
  nodes: number;
  readonly places: Place[];
  readonly pages: Set<string>;
}

export class VariableUsageIndex {
  readonly #byId = new Map<string, Entry>();
  /**
   * Ноды с их привязками.
   *
   * Нужен, чтобы делить ноды по локальности точно, а не оценочно: мест на
   * токен хранится ограниченное число, и считать по ним значит занижать.
   * Записей здесь столько, сколько нод с токенами — на боевом файле это
   * двадцать тысяч, а не сто десять.
   */
  readonly #byNode = new Map<string, string[]>();

  add(variableId: string, place: Place): void {
    const onNode = this.#byNode.get(place.nodeId);
    if (onNode?.includes(variableId) === true) return;

    const entry = this.#byId.get(variableId);
    if (entry === undefined) {
      this.#byId.set(variableId, { nodes: 1, places: [place], pages: new Set([place.pageId]) });
    } else {
      entry.nodes++;
      entry.pages.add(place.pageId);
      if (entry.places.length < PLACES_PER_VARIABLE) entry.places.push(place);
    }

    if (onNode === undefined) this.#byNode.set(place.nodeId, [variableId]);
    else onNode.push(variableId);
  }

  get size(): number {
    return this.#byId.size;
  }

  /**
   * Делит ноды на живущие на локальных и на библиотечных токенах.
   *
   * Нода считается один раз. Непроверенная привязка делает покрытие
   * непроверенным; среди полностью известных привязок локальная имеет приоритет. Иначе двойной учёт раздул бы сумму выше числа нод.
   */
  splitByLocality(state: (variableId: string) => 'local' | 'library' | 'unavailable'): {
    onLocal: number;
    onLibrary: number;
    unavailable: number;
  } {
    let onLocal = 0;
    let onLibrary = 0;
    let unavailable = 0;

    for (const variableIds of this.#byNode.values()) {
      // Нода с локальной и библиотечной привязками считается локальной:
      // иначе она попала бы в оба счётчика и сумма превысила бы число нод.
      const states = variableIds.map(state);
      if (states.includes('unavailable')) unavailable++;
      else if (states.includes('local')) onLocal++;
      else onLibrary++;
    }

    return { onLocal, onLibrary, unavailable };
  }

  /** Поиск по всему индексу с ограниченной порцией для iframe. */
  search(
    resolve: (id: string) => { name: string; collectionName: string } | null,
    query: string,
    offset: number,
  ): { items: readonly VariableUsage[]; total: number } {
    const needle = query.trim().toLowerCase();
    const all = this.describe((id) => {
      const token = resolve(id);
      if (token === null) return null;
      return token.name.toLowerCase().includes(needle) ||
        token.collectionName.toLowerCase().includes(needle)
        ? token
        : null;
    }, Infinity);
    const start = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
    return { items: all.slice(start, start + 50), total: all.length };
  }

  /** Использование токенов, от самых востребованных к редким. */
  describe(
    resolve: (id: string) => { name: string; collectionName: string } | null,
    limit: number,
  ): readonly VariableUsage[] {
    const result: VariableUsage[] = [];

    for (const [id, entry] of this.#byId) {
      const resolved = resolve(id);
      if (resolved === null) continue;
      result.push({
        id,
        name: resolved.name,
        collectionName: resolved.collectionName,
        nodes: entry.nodes,
        pages: entry.pages.size,
        places: entry.places,
      });
    }

    return result.sort((a, b) => b.nodes - a.nodes).slice(0, limit);
  }
}
