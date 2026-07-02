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

function tierToBadge(tier: TierConfig): StatusBadge | null {
  if (tier.color === 'none') return null;
  const cls = COLOR_CLASSES[tier.color] ?? COLOR_CLASSES['none'];
  return { label: tier.label, bgClass: cls.bg, textClass: cls.text };
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
    // raw value is 0–1; thresholds are in % (0–100)
    return this.classifyIndicator(value !== null && value !== undefined ? value * 100 : null, this.current.ics);
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
}
