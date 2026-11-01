/**
 * Canonical key for a feature bundle.
 *
 * Feature bundles compare by content, not by key order. Two sources describing
 * the same cell may list axes in a different order; without canonicalisation a
 * correction would silently miss its target cell and two cells that should merge
 * would not.
 */
export function featureKey(features: Record<string, string>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(features).sort(([a], [b]) => a.localeCompare(b))),
  );
}
