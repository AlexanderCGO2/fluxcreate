// Extracted unchanged from the user-owned Flux Mem Layer, 2026-09-26.
// Source: D:/OMMAX/packages/mem-layer/src/budget.ts
/**
 * Token budgets for the sections of a context package.
 *
 * Until 2026-09-26 the package was one list cut at 16 facts, and the campaign
 * lines, the brand record and the five newest events always took 15 of them:
 * in every phase ONE retrieved fact reached an agent, and the disclaimers,
 * the other rules, every vector hit and the car record never did
 * (docs/plans/2026-09-26-memory-layer-plan.md §7.3). A shared count cap makes
 * whatever comes first win. So each section has its own budget instead, in
 * approximate tokens, and the sections that must reach an agent whole have
 * none at all:
 *
 *   campaign, binding, brand, invariants  never cut
 *   house-style rules                      HOUSE_STYLE budget
 *   approved client preferences            PREFERENCES budget
 *   campaign history (newest events)       HISTORY budget
 *   retrieved knowledge                    RETRIEVED budget
 *
 * A line is kept whole or dropped whole — never shortened, never summarised —
 * and every drop is recorded on the package (`dropped`), so a cut is never
 * silent and the measurement can report it.
 */

/** ~4 characters a token: the estimate the package and the measurement share. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface SectionBudgets {
  houseStyle: number;
  preferences: number;
  history: number;
  retrieved: number;
}

/**
 * The budgets, in approximate tokens. Sized on the reference campaign
 * (black-friday-zs-hybrid-mg-zs-hybrid, 2026-09-26) so nothing is cut there
 * today and a campaign with longer records is cut visibly:
 *   - house style: 4 rules of ~40 tokens; room for about ten;
 *   - preferences: a preference line with its citations is ~80 tokens;
 *   - history: the five newest events are ~40–90 tokens each;
 *   - retrieved: up to 12 hits (4 namespaces × 3) of ~50–250 tokens.
 */
export const SECTION_BUDGETS: SectionBudgets = {
  houseStyle: 400,
  preferences: 600,
  history: 400,
  retrieved: 1200,
};

export interface FitResult {
  kept: string[];
  dropped: string[];
  tokens: number;
}

/**
 * Keep lines in their order while they fit. A line that does not fit is
 * dropped and the next is tried, so one long hit does not take the shorter
 * ones behind it down with it.
 */
export function fitToBudget(lines: readonly string[], budget: number): FitResult {
  const kept: string[] = [];
  const dropped: string[] = [];
  let tokens = 0;
  for (const line of lines) {
    const cost = estimateTokens(line);
    if (tokens + cost > budget) {
      dropped.push(line);
      continue;
    }
    kept.push(line);
    tokens += cost;
  }
  return { kept, dropped, tokens };
}
