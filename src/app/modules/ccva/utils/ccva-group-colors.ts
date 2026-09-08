// Shared coloring for the Display Data table's grouped views (Pie/Bar chart
// slices, Map markers) - kept in one place so a given group value (e.g.
// "Group III: Injuries") always renders the same color everywhere.

// The 4 Broad Category values are a fixed, known set (see
// backend/app/pcva/services/target_cause_categories.py) - direct string
// lookup rather than the keyword heuristic ccva-graphs.component.ts uses
// for raw cause names (that heuristic doesn't match these category strings
// correctly - see the exploration that found this while planning this
// feature).
export const BROAD_CATEGORY_COLORS: Record<string, string> = {
  'Group I: Communicable': '#b2182b',
  'Group II: Non-Communicable': '#2166ac',
  'Group III: Injuries': '#238b45',
  Unusable: '#9ca3af',
};

// Fallback palette for any other Group By dimension (Gender, Age Group,
// Major Category, Region/District/Ward) - assigned deterministically by
// sorted label so the same value always gets the same color across
// requests/renders.
const CATEGORICAL_PALETTE: string[] = [
  '#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#d946ef', '#eab308', '#0ea5e9', '#f43f5e',
];

export function colorMapForValues(values: string[]): Record<string, string> {
  const sorted = [...new Set(values)].sort();
  const map: Record<string, string> = {};
  sorted.forEach((value, i) => {
    map[value] = CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length];
  });
  return map;
}

// groupBy: the active Group By dimension ('broad', 'gender', ...).
// value: this row/slice's group label.
// fallbackMap: a colorMapForValues() result, used for every dimension other
// than 'broad'.
export function colorForGroup(groupBy: string, value: string, fallbackMap: Record<string, string>): string {
  if (groupBy === 'broad' && BROAD_CATEGORY_COLORS[value]) {
    return BROAD_CATEGORY_COLORS[value];
  }
  return fallbackMap[value] || '#3b82f6';
}
