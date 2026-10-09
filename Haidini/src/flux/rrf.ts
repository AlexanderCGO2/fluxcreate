// Extracted unchanged from the user-owned Flux Mem Layer, 2026-09-26.
// Source: D:/OMMAX/packages/mem-layer/src/rrf.ts
/**
 * Reciprocal rank fusion (Cormack, Clarke & Büttcher, 2009): each list votes
 * 1 / (k + rank) for every item in it, ranks counted from 1, and items are
 * ordered by the sum of their votes. k = 60 is the paper's constant and the
 * one Hindsight uses; it keeps one list's first place from outvoting an item
 * that both lists rank well.
 *
 * Only ranks are used, never the lists' own scores, which is the point: a
 * cosine similarity and a `ts_rank_cd` are not on the same scale and cannot
 * be added. Ties keep the order of first appearance (first list first), so
 * the result is deterministic.
 */
export const RRF_K = 60;

export function reciprocalRankFusion<T>(
  lists: readonly (readonly T[])[],
  key: (item: T) => string,
  k: number = RRF_K,
): Array<{ item: T; score: number }> {
  const fused = new Map<string, { item: T; score: number; first: number }>();
  let order = 0;
  for (const list of lists) {
    const seen = new Set<string>();
    list.forEach((item, index) => {
      const id = key(item);
      // A list that repeats an item votes for it once, at its best rank.
      if (seen.has(id)) return;
      seen.add(id);
      const vote = 1 / (k + index + 1);
      const entry = fused.get(id);
      if (entry) entry.score += vote;
      else fused.set(id, { item, score: vote, first: order++ });
    });
  }
  return [...fused.values()]
    .sort((a, b) => b.score - a.score || a.first - b.first)
    .map(({ item, score }) => ({ item, score }));
}
