import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SettingConfigService } from '../../settings/services/settings_configs.service';
import {
  DqaThresholds,
  IndicatorThresholds,
  AidThresholds,
  TierConfig,
} from '../../settings/interface';

// ── Status badge (same shape as general-dqa.component.ts StatusBadge) ────────

export interface StatusBadge {
  label:     string;
  bgClass:   string;
  textClass: string;
}

// ── Color → Tailwind class map ────────────────────────────────────────────────

const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-emerald-500', text: 'text-white' },
  amber: { bg: 'bg-amber-400',   text: 'text-white' },
  red:   { bg: 'bg-red-500',     text: 'text-white' },
  none:  { bg: 'bg-gray-200',    text: 'text-gray-600' },
};

// Hex equivalents of the classes above, for contexts that can't use
// Tailwind - Leaflet's inline-styled divIcon HTML (the Data Map's
// DQA-indicator coloring) being the first of these. `none`'s hex is a
// visible mid-gray (Tailwind gray-400) rather than the very light
// gray-200 the badge uses, since a map dot in gray-200 is barely visible
// against the basemap.
const COLOR_HEX: Record<string, string> = {
  green: '#10b981',
  amber: '#fbbf24',
  red:   '#ef4444',
  none:  '#9ca3af',
};

function tierToBadge(tier: TierConfig): StatusBadge | null {
  if (tier.color === 'none') return null;
  const cls = COLOR_CLASSES[tier.color] ?? COLOR_CLASSES['none'];
  return { label: tier.label, bgClass: cls.bg, textClass: cls.text };
}

function tierColorHex(tier: TierConfig): string {
  return COLOR_HEX[tier.color] ?? COLOR_HEX['none'];
}

// AID has 3 real tiers, but the admin-configurable `color` field only ever
// has 4 buckets (green/amber/red/none), and the *default* config (and any
// admin config that leaves the defaults alone) assigns 'red' to BOTH
// tier_short and tier_long and 'none' to tier_normal - fine for a
// dashboard badge (color:'none' just means "show no badge", so a
// collision there is invisible), but on the map every tier needs a color
// a viewer can actually tell apart, and "Too Short" vs "Too Long" both
// rendering as the same red bubble defeats the point. So the map/legend
// use their own fixed 3-color palette for AID specifically, independent
// of tierToBadge's color - the admin-configured *labels* are still used,
// just not the 4-bucket color field, since it can't represent 3 distinct
// non-neutral states.
const AID_MAP_COLORS = {
  short: '#f59e0b',  // amber - Too Short
  normal: '#10b981', // green - Normal
  long: '#ef4444',   // red - Too Long
};

// Unlike StatusBadge (null for the "none"/unflagged tier, since the
// dashboard simply shows no badge then), a map needs *some* color for
// every point, including "Normal" AID records - so this is never null for
// a real value.
export interface TierColor {
  label: string;
  colorHex: string;
}

// ── Defaults (mirror the Python backend defaults) ─────────────────────────────

export const DEFAULT_DQA_THRESHOLDS: DqaThresholds = {
  ics: {
    threshold_high: 90, threshold_mid: 70,
    tier1: { label: 'Excellent', color: 'green' },
    tier2: { label: 'Good',      color: 'amber' },
    tier3: { label: 'Critical',  color: 'red'   },
  },
  rrs: {
    threshold_high: 80, threshold_mid: 50,
    tier1: { label: 'Excellent', color: 'green' },
    tier2: { label: 'Good',      color: 'amber' },
    tier3: { label: 'Critical',  color: 'red'   },
  },
  ici: {
    threshold_high: 90, threshold_mid: 70,
    tier1: { label: 'Excellent', color: 'green' },
    tier2: { label: 'Good',      color: 'amber' },
    tier3: { label: 'Critical',  color: 'red'   },
  },
  aid: {
    min_normal:  30,
    max_normal:  60,
    tier_short:  { label: 'Too Short', color: 'red'  },
    tier_normal: { label: 'Normal',    color: 'none' },
    tier_long:   { label: 'Too Long',  color: 'red'  },
  },
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DqaThresholdService {
  private subj = new BehaviorSubject<DqaThresholds>(DEFAULT_DQA_THRESHOLDS);
  thresholds$ = this.subj.asObservable();

  constructor(private settingConfigService: SettingConfigService) {
    this.loadThresholds();
  }

  private loadThresholds(): void {
    this.settingConfigService.getSettingsConfig().subscribe({
      next: data => {
        if (data?.dqa_thresholds) {
          this.subj.next(data.dqa_thresholds);
        }
      },
    });
  }

  reload(): void {
    this.settingConfigService.getSettingsConfig(false).subscribe({
      next: data => {
        if (data?.dqa_thresholds) {
          this.subj.next(data.dqa_thresholds);
        }
      },
    });
  }

  get current(): DqaThresholds { return this.subj.value; }

  // ── Classify functions ─────────────────────────────────────────────────────

  classifyRrs(value: number | null): StatusBadge | null {
    return this.classifyIndicator(value, this.current.rrs);
  }

  classifyIcs(value: number | null): StatusBadge | null {
    // ICS arrives as a percentage (0-100) from compute_ics, same as ICI and
    // RRS, and the thresholds are in % too - so it is compared directly.
    // The previous *100 pushed every value past the top threshold, so the
    // tier badge always read "best" no matter the actual score.
    return this.classifyIndicator(value, this.current.ics);
  }

  classifyIci(value: number | null): StatusBadge | null {
    return this.classifyIndicator(value, this.current.ici);
  }

  classifyAid(value: number | null): StatusBadge | null {
    if (value === null || value === undefined) return null;
    const t       = this.current.aid;
    const minutes = Math.round(value);
    if (minutes > t.max_normal) return tierToBadge(t.tier_long);
    if (minutes < t.min_normal) return tierToBadge(t.tier_short);
    return tierToBadge(t.tier_normal);
  }

  private classifyIndicator(value: number | null, cfg: IndicatorThresholds): StatusBadge | null {
    if (value === null || value === undefined) return null;
    if (value >= cfg.threshold_high) return tierToBadge(cfg.tier1);
    if (value >= cfg.threshold_mid)  return tierToBadge(cfg.tier2);
    return tierToBadge(cfg.tier3);
  }

  // ── Map coloring (Data Map's DQA-indicator donut bubbles) ─────────────────
  // Same tiers/thresholds as the classify* functions above - just returns a
  // color for every tier (including "none"/unflagged), since a map point
  // needs to be drawn in some color regardless.

  colorFor(indicator: 'rrs' | 'ics' | 'ici' | 'aid', value: number | null): TierColor | null {
    switch (indicator) {
      case 'rrs': return this.colorForIndicator(value, this.current.rrs);
      case 'ics': return this.colorForIndicator(value, this.current.ics);
      case 'ici': return this.colorForIndicator(value, this.current.ici);
      case 'aid': return this.colorForAid(value);
    }
  }

  // The fixed set of tier label/color pairs for an indicator, independent
  // of any single record's value - for rendering a legend.
  legendFor(indicator: 'rrs' | 'ics' | 'ici' | 'aid'): TierColor[] {
    if (indicator === 'aid') {
      const t = this.current.aid;
      return [
        { label: t.tier_short.label, colorHex: AID_MAP_COLORS.short },
        { label: t.tier_normal.label, colorHex: AID_MAP_COLORS.normal },
        { label: t.tier_long.label, colorHex: AID_MAP_COLORS.long },
      ];
    }
    const cfg = this.current[indicator];
    return [cfg.tier1, cfg.tier2, cfg.tier3]
      .map(tier => ({ label: tier.label, colorHex: tierColorHex(tier) }));
  }

  private colorForAid(value: number | null): TierColor | null {
    if (value === null || value === undefined) return null;
    const t       = this.current.aid;
    const minutes = Math.round(value);
    if (minutes > t.max_normal) return { label: t.tier_long.label, colorHex: AID_MAP_COLORS.long };
    if (minutes < t.min_normal) return { label: t.tier_short.label, colorHex: AID_MAP_COLORS.short };
    return { label: t.tier_normal.label, colorHex: AID_MAP_COLORS.normal };
  }

  private colorForIndicator(value: number | null, cfg: IndicatorThresholds): TierColor | null {
    if (value === null || value === undefined) return null;
    const tier = value >= cfg.threshold_high ? cfg.tier1 : value >= cfg.threshold_mid ? cfg.tier2 : cfg.tier3;
    return { label: tier.label, colorHex: tierColorHex(tier) };
  }
}
