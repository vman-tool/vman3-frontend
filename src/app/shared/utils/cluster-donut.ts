// Pure, framework-agnostic pieces of the "donut cluster bubble with a
// hover breakdown" pattern - extracted from the CCVA map view
// (ccva-map-view.component.ts) so the Data Map's DQA-indicator coloring can
// reuse the exact same drawing logic instead of a second, diverging copy.
// Nothing here touches Angular or a live Leaflet map instance - callers
// wrap the returned HTML strings in their own L.divIcon()/bindTooltip().

export interface DonutBreakdownEntry {
  value: string;
  label: string;
  color: string;
  count: number;
}

// Tallies `items` by `getValue`, most common first - the shared basis for a
// cluster bubble's pie slices AND its hover breakdown, so the two always
// agree exactly. Items with no value (null/undefined/empty string) fall
// into an "Unclassified" bucket rather than being dropped.
export function computeBreakdown<T>(
  items: T[],
  getValue: (item: T) => string | null | undefined,
  colorFor: (value: string) => string,
  labelFor: (value: string) => string = value => value,
  unclassifiedColor = '#9ca3af',
): DonutBreakdownEntry[] {
  const tally = new Map<string, number>();
  for (const item of items) {
    const raw = getValue(item);
    const value = raw || 'Unclassified';
    tally.set(value, (tally.get(value) || 0) + 1);
  }
  return [...tally.entries()]
    .map(([value, count]) => ({
      value,
      label: value === 'Unclassified' ? value : labelFor(value),
      color: value === 'Unclassified' ? unclassifiedColor : colorFor(value),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function pieGradient(breakdown: DonutBreakdownEntry[], total: number, fallbackColor = '#3b82f6'): string {
  if (!breakdown.length) return fallbackColor;
  // Stable (alphabetical-by-value) slice order so the same category sits in
  // the same position across every bubble on the map - much easier to
  // compare a cluster in one region against another at a glance.
  const ordered = [...breakdown].sort((a, b) => a.value.localeCompare(b.value));
  let cumulative = 0;
  const stops = ordered.map(entry => {
    const start = (cumulative / total) * 360;
    cumulative += entry.count;
    const end = (cumulative / total) * 360;
    return `${entry.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

// A donut colored by the proportion of each group value among this
// cluster's points, with the total count badged in the middle. The center
// is a genuine hole (via a CSS mask cut out of the ring, not just an inner
// disc painted a different color) so whatever is underneath (the basemap)
// shows straight through it. Returns the inner HTML for an L.divIcon -
// callers own the divIcon() call itself (iconSize/iconAnchor).
export function donutClusterIconHtml(count: number, breakdown: DonutBreakdownEntry[], sz: number, fs: number): string {
  const gradient = pieGradient(breakdown, count);
  // hole radius as % of the bubble's own radius (55 => a 0.275*sz hole
  // inside a 0.5*sz bubble). Must be "circle closest-side", not bare
  // "circle" - the bare keyword sizes percentages against the box's
  // *farthest corner* (~1.41x the radius for a square box), which silently
  // makes the hole far bigger and the ring far thinner than intended.
  const holePct = 55;
  const ringMask = `radial-gradient(circle closest-side, transparent 0 ${holePct}%, black ${holePct + 1}% 100%)`;
  return `
    <div style="position:relative;width:${sz}px;height:${sz}px">
      <div style="position:absolute;inset:0;border-radius:50%;background:${gradient};border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);-webkit-mask:${ringMask};mask:${ringMask}"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#111827;font:700 ${fs}px/1 sans-serif;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff">${count}</div>
    </div>
  `;
}

// Kept deliberately compact (small swatch, tight row spacing); rendered on
// a translucent background by the caller's own tooltip CSS class so an
// opted-in hover tooltip still doesn't fully hide the bubbles/basemap
// underneath it. `unitLabel` names what's being counted (e.g. "VA records").
export function clusterTooltipHtml(count: number, breakdown: DonutBreakdownEntry[], unitLabel = 'VA records'): string {
  const gradient = pieGradient(breakdown, count);
  const rows = breakdown
    .map(entry => {
      const pct = ((entry.count / count) * 100).toFixed(1);
      return `
        <tr>
          <td style="padding:1px 5px 1px 0"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${entry.color}"></span></td>
          <td style="padding:1px 6px 1px 0;color:#374151;white-space:nowrap">${entry.label}</td>
          <td style="padding:1px 0;text-align:right;font-weight:600;color:#111827;white-space:nowrap">${entry.count} (${pct}%)</td>
        </tr>
      `;
    })
    .join('');
  return `
    <div style="min-width:150px;font-family:sans-serif;font-size:11px">
      <div style="font-weight:700;font-size:11.5px;margin-bottom:4px;color:#111827">${count.toLocaleString()} ${unitLabel}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:30px;height:30px;border-radius:50%;background:${gradient};flex-shrink:0;border:1px solid rgba(0,0,0,0.06)"></div>
        <table style="border-collapse:collapse">${rows}</table>
      </div>
    </div>
  `;
}
