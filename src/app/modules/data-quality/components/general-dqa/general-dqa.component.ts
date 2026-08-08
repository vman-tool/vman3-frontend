import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  GeneralDqaService,
  DistStat,
  GroupedStats,
  IciStats,
  InterviewerIci,
  SnapshotStatus,
} from '../../services/general-dqa.service';
import { DqaThresholdService, StatusBadge as ThresholdBadge } from '../../services/dqa-threshold.service';

// ─── SVG distribution visualisation ────────────────────────────────────────

export type ActiveCard = 'duration' | 'ics' | 'rrs' | 'ici';

const SVG_W = 120;
const SVG_H = 34;

export interface VizData {
  svgPath:   string;
  meanX:     number;
  medianX:   number;
  fillColor: string;
  stroke:    string;
  skewLabel: string;
  skewClass: string;
}

function buildViz(avg: number | null, std: number | null, p50: number | null, count: number): VizData | null {
  if (!avg || !std || std === 0 || count === 0) return null;

  const median = p50 ?? avg;
  const xMin   = avg - 3.5 * std;
  const xMax   = avg + 3.5 * std;
  const range  = xMax - xMin;
  const toSvgX = (v: number) => Math.max(0, Math.min(SVG_W, ((v - xMin) / range) * SVG_W));

  const STEPS = 60;
  const pts: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const x     = xMin + (i / STEPS) * range;
    const yNorm = Math.exp(-0.5 * ((x - avg) / std) ** 2);
    const svgX  = (i / STEPS) * SVG_W;
    const svgY  = SVG_H - yNorm * (SVG_H - 5) - 2;
    pts.push(`${svgX.toFixed(1)},${svgY.toFixed(1)}`);
  }

  const svgPath   = `M 0,${SVG_H} L ` + pts.join(' L ') + ` L ${SVG_W},${SVG_H} Z`;
  const meanX     = toSvgX(avg);
  const medianX   = toSvgX(median);
  const skewCoeff = (avg - median) / std;

  let fillColor: string, stroke: string, skewLabel: string, skewClass: string;
  if (skewCoeff > 0.5) {
    fillColor = 'rgba(251,146,60,0.22)'; stroke = '#f97316';
    skewLabel = '→ Right skew'; skewClass = 'text-orange-500';
  } else if (skewCoeff < -0.5) {
    fillColor = 'rgba(96,165,250,0.22)'; stroke = '#3b82f6';
    skewLabel = '← Left skew'; skewClass = 'text-blue-500';
  } else {
    fillColor = 'rgba(148,163,184,0.22)'; stroke = '#94a3b8';
    skewLabel = '~ Symmetric'; skewClass = 'text-gray-400';
  }

  return { svgPath, meanX, medianX, fillColor, stroke, skewLabel, skewClass };
}

// ─── Shared status badge ────────────────────────────────────────────────────

export interface StatusBadge {
  label:     string;
  bgClass:   string;
  textClass: string;
}

// RRS tiers: ≥80 High · 50-79 Moderate · <50 Low
export function rrsClassify(avg: number | null): StatusBadge | null {
  if (avg === null || avg === undefined) return null;
  if (avg >= 80) return { label: 'High Accuracy',     bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (avg >= 50) return { label: 'Moderate Accuracy', bgClass: 'bg-amber-50',   textClass: 'text-amber-700'   };
  return            { label: 'Low Accuracy',       bgClass: 'bg-red-50',     textClass: 'text-red-700'     };
}

// ICI tiers: ≥90 Excellent · 70-89 Good · <70 Critical
export function iciClassify(ici: number | null): StatusBadge | null {
  if (ici === null || ici === undefined) return null;
  if (ici >= 90) return { label: 'Excellent', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (ici >= 70) return { label: 'Good',      bgClass: 'bg-amber-50',   textClass: 'text-amber-700'   };
  return           { label: 'Critical',   bgClass: 'bg-red-50',     textClass: 'text-red-700'     };
}

// ─── Unified distribution table row ────────────────────────────────────────

export interface IndicatorRow {
  name:     string;
  category: string;
  stat:     DistStat;
  viz:      VizData | null;
}

function toRows(stats: GroupedStats): IndicatorRow[] {
  const ag = stats.by_age_group;
  const gn = stats.by_gender_adult;
  const entries: Array<{ name: string; category: string; stat: DistStat }> = [
    { name: 'Adults',        category: 'Age Group',       stat: ag.adults        },
    { name: 'Children',      category: 'Age Group',       stat: ag.children      },
    { name: 'Neonates',      category: 'Age Group',       stat: ag.neonates      },
    { name: 'Male Adults',   category: 'Gender (Adults)', stat: gn.male_adults   },
    { name: 'Female Adults', category: 'Gender (Adults)', stat: gn.female_adults },
  ];
  return entries.map(e => ({
    ...e,
    viz: buildViz(e.stat.avg, e.stat.stddev, e.stat.p50, e.stat.count),
  }));
}

// ─── ICI interviewer display item ──────────────────────────────────────────
// Each item is either a real data row or a "· · · N hidden · · ·" separator.

export interface IciDisplayItem {
  isSep:   boolean;
  rank:    number;              // 0 for separators
  data:    InterviewerIci | null;
  skipped: number;              // 0 for data rows
}

function buildIciDisplayItems(rows: InterviewerIci[]): IciDisplayItem[] {
  if (rows.length <= 6) {
    return rows.map((r, i) => ({ isSep: false, rank: i + 1, data: r, skipped: 0 }));
  }
  // Select top-2, middle-1, bottom-2; deduplicate adjacent indices
  const midIdx = Math.floor((rows.length - 1) / 2);
  const picks  = Array.from(new Set([0, 1, midIdx, rows.length - 2, rows.length - 1]))
                      .sort((a, b) => a - b);

  const items: IciDisplayItem[] = [];
  picks.forEach((idx, pos) => {
    if (pos > 0) {
      const gap = idx - picks[pos - 1] - 1;
      if (gap > 0) {
        items.push({ isSep: true, rank: 0, data: null, skipped: gap });
      }
    }
    items.push({ isSep: false, rank: idx + 1, data: rows[idx], skipped: 0 });
  });
  return items;
}

// ─── Component ─────────────────────────────────────────────────────────────

@Component({
  standalone: false,
  selector:    'app-general-dqa',
  templateUrl: './general-dqa.component.html',
  styleUrl:    './general-dqa.component.scss',
})
export class GeneralDqaComponent implements OnInit, OnDestroy {

  // Individual indicator state (populated from analytics snapshot)
  durationStats: GroupedStats | null = null;
  isDurationLoading = true;
  hasDurationError  = false;

  icsStats: GroupedStats | null = null;
  isIcsLoading = true;
  hasIcsError  = false;

  rrsStats: GroupedStats | null = null;
  isRrsLoading = true;
  hasRrsError  = false;

  iciStats: IciStats | null = null;
  isIciLoading = true;
  hasIciError  = false;

  // Analytics snapshot metadata
  computedAt: string | null = null;
  analyticsStatus: SnapshotStatus | null = null;
  isRefreshing = false;

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  // Which card drives the breakdown table
  activeCard: ActiveCard = 'rrs';

  constructor(
    private svc: GeneralDqaService,
    private thresholdSvc: DqaThresholdService,
  ) {}

  ngOnInit(): void {
    this.loadFromSnapshot();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  loadFromSnapshot(): void {
    this.svc.getAnalyticsSnapshot().subscribe({
      next: r => {
        const snap = r?.data;
        if (snap) {
          this.rrsStats      = snap.rrs  ?? null;
          this.icsStats      = snap.ics  ?? null;
          this.iciStats      = snap.ici  ?? null;
          this.durationStats = snap.aid  ?? null;
          this.computedAt    = snap.computed_at ?? null;
          this.analyticsStatus = snap.status ?? null;

          // Poll while a computation is in progress.
          if (snap.status === 'running') {
            this.pollTimer = setTimeout(() => this.loadFromSnapshot(), 5000);
          }
        }
        // Clear loading states regardless — data may be null if snapshot not yet built.
        this.isDurationLoading = this.isIcsLoading = this.isRrsLoading = this.isIciLoading = false;
      },
      error: () => {
        this.hasDurationError = this.hasIcsError = this.hasRrsError = this.hasIciError = true;
        this.isDurationLoading = this.isIcsLoading = this.isRrsLoading = this.isIciLoading = false;
      },
    });
  }

  forceRefresh(): void {
    if (this.isRefreshing || this.analyticsStatus === 'running') return;
    this.isRefreshing = true;
    this.svc.refreshAnalytics().subscribe({
      next: () => {
        this.analyticsStatus = 'running';
        this.isRefreshing = false;
        this.pollTimer = setTimeout(() => this.loadFromSnapshot(), 3000);
      },
      error: () => { this.isRefreshing = false; },
    });
  }

  setActiveCard(card: ActiveCard): void { this.activeCard = card; }

  // ── Derived state for the active card ──────────────────────────────────

  get isActiveLoading(): boolean {
    if (this.activeCard === 'duration') return this.isDurationLoading;
    if (this.activeCard === 'rrs')      return this.isRrsLoading;
    if (this.activeCard === 'ici')      return this.isIciLoading;
    return this.isIcsLoading;
  }
  get hasActiveError(): boolean {
    if (this.activeCard === 'duration') return this.hasDurationError;
    if (this.activeCard === 'rrs')      return this.hasRrsError;
    if (this.activeCard === 'ici')      return this.hasIciError;
    return this.hasIcsError;
  }

  // Distribution rows (not used for ICI — ICI has its own interviewer table)
  get activeIndicators(): IndicatorRow[] {
    if (this.isActiveLoading || this.activeCard === 'ici') return [];
    let s: GroupedStats | null;
    if (this.activeCard === 'duration') s = this.durationStats;
    else if (this.activeCard === 'rrs') s = this.rrsStats;
    else                                s = this.icsStats;
    return s ? toRows(s) : [];
  }

  get activeCardLabel(): string {
    if (this.activeCard === 'duration') return 'Avg Duration';
    if (this.activeCard === 'rrs')      return 'Avg RRS';
    if (this.activeCard === 'ici')      return 'ICI Score';
    return 'Avg ICS';
  }
  get activeCardDescription(): string {
    if (this.activeCard === 'duration')
      return 'Average interview duration by age group and gender';
    if (this.activeCard === 'rrs')
      return 'Respondent Reliability Score (0–100) by age group and gender';
    if (this.activeCard === 'ici')
      return 'Internal Consistency Index — logical contradiction rate by interviewer';
    return 'Informative Completeness Score by age group and gender';
  }

  // ── KPI card values ────────────────────────────────────────────────────

  get overallDuration(): string      { return this.fmtMin(this.durationStats?.overall?.avg ?? null); }
  get overallDurationCount(): number { return this.durationStats?.overall?.count ?? 0; }
  get overallDurationTier(): StatusBadge | null { return this.thresholdSvc.classifyAid(this.durationStats?.overall?.avg ?? null); }

  get overallIcs(): string      { return this.fmtPct(this.icsStats?.overall?.avg ?? null); }
  get overallIcsCount(): number { return this.icsStats?.overall?.count ?? 0; }
  get overallIcsTier(): StatusBadge | null { return this.thresholdSvc.classifyIcs(this.icsStats?.overall?.avg ?? null); }

  get overallRrs(): string      { return this.fmtRrs(this.rrsStats?.overall?.avg ?? null); }
  get overallRrsCount(): number { return this.rrsStats?.overall?.count ?? 0; }
  get overallRrsTier(): StatusBadge | null { return this.thresholdSvc.classifyRrs(this.rrsStats?.overall?.avg ?? null); }

  get overallIci(): string      { return this.fmtIci(this.iciStats?.overall_ici ?? null); }
  get overallIciTotal(): number { return this.iciStats?.overall_total  ?? 0; }
  get overallIciPassed(): number{ return this.iciStats?.overall_passed ?? 0; }
  get overallIciTier(): StatusBadge | null { return this.thresholdSvc.classifyIci(this.iciStats?.overall_ici ?? null); }

  // ICI interviewer rows — full list for reference
  get iciInterviewers(): InterviewerIci[] { return this.iciStats?.interviewers ?? []; }

  // ICI display items: top-2 / middle / bottom-2 with separators (all if ≤ 6)
  get iciDisplayItems(): IciDisplayItem[] {
    return buildIciDisplayItems(this.iciStats?.interviewers ?? []);
  }
  get iciInterviewerCount(): number { return this.iciStats?.interviewers?.length ?? 0; }

  // ── Formatters ─────────────────────────────────────────────────────────

  fmtActiveValue(v: number | null): string {
    if (this.activeCard === 'duration') return this.fmtMin(v);
    if (this.activeCard === 'rrs')      return this.fmtRrs(v);
    return this.fmtPct(v);
  }
  fmtActiveStddev(v: number | null): string {
    if (this.activeCard === 'duration') return this.fmtMinStd(v);
    if (this.activeCard === 'rrs')      return this.fmtRrsStd(v);
    return this.fmtPctStd(v);
  }

  fmtMin(v: number | null): string {
    if (v === null || v === undefined) return '--';
    const m = Math.round(v);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
  }
  fmtMinStd(v: number | null): string {
    if (!v || v === 0) return '';
    return `± ${Math.round(v)} min`;
  }

  // ICS already arrives as a percentage (0-100) from compute_ics, like ICI
  // and RRS. Multiplying by 100 here rendered 98.5% as 9854.2%.
  fmtPct(v: number | null): string {
    if (v === null || v === undefined) return '--';
    return `${v.toFixed(1)}%`;
  }
  fmtPctStd(v: number | null): string {
    if (!v || v === 0) return '';
    return `± ${v.toFixed(1)}%`;
  }

  fmtRrs(v: number | null): string {
    if (v === null || v === undefined) return '--';
    return `${v.toFixed(1)} / 100`;
  }
  fmtRrsStd(v: number | null): string {
    if (!v || v === 0) return '';
    return `± ${v.toFixed(1)}`;
  }

  fmtIci(v: number | null): string {
    if (v === null || v === undefined) return '--';
    return `${v.toFixed(1)}%`;
  }
  fmtIciRow(v: number): string { return `${v.toFixed(1)}%`; }

  rrsRowTier(stat: DistStat):      StatusBadge | null { return this.thresholdSvc.classifyRrs(stat.avg); }
  icsRowTier(stat: DistStat):      StatusBadge | null { return this.thresholdSvc.classifyIcs(stat.avg); }
  durationRowTier(stat: DistStat): StatusBadge | null { return this.thresholdSvc.classifyAid(stat.avg); }
  iciRowTier(row: InterviewerIci | null): StatusBadge | null { return row ? this.thresholdSvc.classifyIci(row.ici) : null; }

  readonly SVG_W = SVG_W;
  readonly SVG_H = SVG_H;
}
