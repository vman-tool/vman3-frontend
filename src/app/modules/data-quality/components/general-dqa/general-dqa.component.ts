import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
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

// ─── Indicator methodology info (for the (i) popup on each KPI card) ───────
// Sourced from this project's own validation manuscript
// (vman_dq/reports/manuscript_v2.docx, section 2.3 "Indicator Definitions")
// - kept here as static reference content rather than fetched at runtime.

export interface IndicatorInfo {
  name: string;
  summary: string;
  formula: string;
  components?: { label: string; detail: string }[];
  tiers: { label: string; range: string }[];
  notes: string[];
}

export const INDICATOR_INFO: Record<ActiveCard, IndicatorInfo> = {
  rrs: {
    name: 'Respondent Reliability Score (RRS)',
    summary: 'A weighted composite reflecting how reliable the respondent’s proxy-reported information is likely to be - not a direct, verified measure of accuracy.',
    formula: 'RRS = Wᵣₑₗ + Wₚᵣₒₓ + Wᵣₑᴄ + Wₑᴅᵤ  (out of 100)',
    components: [
      { label: 'Relationship to deceased (max 40)', detail: 'Spouse/parent/child = 40 · other family member = 20 · other = 10' },
      { label: 'Presence at death (max 30)', detail: 'Yes = 30 · No = 15' },
      { label: 'Recall period (max 20)', detail: '< 90 days = 20 · 90–179 days = 15 · 180–364 days = 10 · ≥ 365 days = 0' },
      { label: 'Respondent literacy proxy (max 10)', detail: 'Literate / secondary+ education = 10 · none or illiterate = 5. Uses the deceased’s own education fields, since the WHO-VA instrument does not capture respondent education directly.' },
    ],
    tiers: [
      { label: 'High', range: '≥ 80' },
      { label: 'Moderate', range: '50–79' },
      { label: 'Low', range: '< 50' },
    ],
    notes: [
      'Records with no parseable death or interview date are excluded, since the recall-period component cannot be computed.',
      'RRS measures respondent characteristics associated with reliable reporting - it is not a direct check of whether the answers given are actually correct.',
    ],
  },
  ics: {
    name: 'Informative Completeness Score (ICS)',
    summary: 'The share of binary (yes/no) questions a respondent answered definitively, rather than with “don’t know” or “refused”.',
    formula: 'ICS = (informative yes/no answers ÷ all yes/no answers given) × 100',
    tiers: [
      { label: 'High', range: '≥ 90%' },
      { label: 'Moderate', range: '70–89%' },
      { label: 'Low', range: '< 70%' },
    ],
    notes: [
      'Only questions that were actually asked and answered are counted - unanswered/system-missing fields are excluded from the denominator, so ICS measures the informativeness of what was recorded, not overall form completeness.',
      'A high ICS does not guarantee accuracy (a respondent can confidently give a wrong answer), but a persistently low ICS signals the respondent could not or did not engage meaningfully with the interview.',
    ],
  },
  ici: {
    name: 'Internal Consistency Index (ICI)',
    summary: 'Flags logically impossible or implausible combinations of answers within the same record - e.g. a symptom reported as lasting longer than the illness itself.',
    formula: 'ICI = ((rules checked − rules violated) ÷ rules checked) × 100',
    tiers: [
      { label: 'Excellent', range: '≥ 90%' },
      { label: 'Good', range: '70–89%' },
      { label: 'Critical', range: '< 70%' },
    ],
    notes: [
      'Up to 9 consistency rules are checked per record - e.g. pregnancy reported for a male decedent, a symptom duration exceeding the total illness duration, or an interview date that precedes the recorded death date.',
      'A rule is skipped entirely for a dataset (not counted as a pass or a fail) if the fields it needs aren’t present in that deployment’s data - it never silently fails records just because a field is missing.',
      'ICI is most informative when reviewed per interviewer: violations concentrated on one interviewer usually point to a training gap rather than random error.',
    ],
  },
  duration: {
    name: 'Median Interview Duration (MID)',
    summary: 'The typical length of a VA interview, from start to finish.',
    formula: 'Per record: Duration = interview end time − interview start time (minutes). Across records: MID = the median of all individual durations.',
    tiers: [
      { label: 'Normal', range: 'within the configured range' },
      { label: 'Too Short / Too Long', range: 'outside it (Settings > Configuration)' },
    ],
    notes: [
      'The median, not the mean, is used to summarise a dataset or interviewer: interview durations are typically right-skewed (a handful of very long interviews would otherwise pull a mean upward), so the median better represents a "typical" interview. Min/max and standard deviation are still shown alongside it to characterise the full spread.',
      'Records with a non-positive or implausible duration (≥ 480 minutes / 8 hours) are excluded, as these almost always reflect a data-entry artefact rather than a real interview.',
      'Unusually short durations can indicate skipped sections or an interview ended early (e.g. consent not obtained); unusually long ones may reflect respondent difficulty or a paused/resumed data-entry session.',
    ],
  },
};

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
  /**
   * Bound on how long this page will keep polling a run that says it is
   * running. The backend now reports an abandoned run as failed after thirty
   * minutes, but a browser left open should give up on its own too rather than
   * poll a dead job until the tab is closed. 5s x 240 = 20 minutes.
   */
  private pollsRemaining = 240;

  // Which card drives the breakdown table
  activeCard: ActiveCard = 'rrs';

  // Which card's methodology popup is open (independent of activeCard, so
  // opening it doesn't also switch the breakdown table).
  infoCard: ActiveCard | null = null;
  readonly indicatorInfo = INDICATOR_INFO;

  // Used from the shared #infoPopupBody <ng-template> instead of indexing
  // `indicatorInfo` directly there: `let-card="card"` has no way to declare
  // its type, so the template sees `card` as `any` - and TS's noImplicitAny
  // specifically disallows indexing a Record (which has no string index
  // signature) with an `any`-typed key. A typed method parameter has no
  // such restriction (passing `any` to an `ActiveCard`-typed parameter is
  // always allowed).
  infoFor(card: ActiveCard): IndicatorInfo {
    return INDICATOR_INFO[card];
  }

  openInfo(card: ActiveCard, event: Event): void {
    event.stopPropagation(); // don't also trigger the card's own (click)="setActiveCard(...)"
    this.infoCard = this.infoCard === card ? null : card; // re-clicking the same (i) toggles it closed
  }

  closeInfo(): void {
    this.infoCard = null;
  }

  // Closes an open popup on any click outside it. No "is this click inside
  // the popup/icon" check is needed here: the popup content and the (i)
  // button both call event.stopPropagation() on their own click handlers
  // (above, and in the template), so a click ever reaches `document` only
  // when it was genuinely outside both - same guarantee the Submissions
  // table's download/columns menus rely on, just without needing a
  // wrapper-class check since stopPropagation already filters at the source.
  @HostListener('document:click')
  onDocumentClickForInfoPopup(): void {
    if (this.infoCard) this.closeInfo();
  }

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

          // Poll while a computation is in progress, but not indefinitely.
          if (snap.status === 'running' && this.pollsRemaining > 0) {
            this.pollsRemaining -= 1;
            this.pollTimer = setTimeout(() => this.loadFromSnapshot(), 5000);
          } else if (snap.status === 'running') {
            // Give up and let the user start a fresh run.
            this.analyticsStatus = 'failed';
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
    this.pollsRemaining = 240;   // a new run gets a fresh budget
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
    if (this.activeCard === 'duration') return 'Median Duration';
    if (this.activeCard === 'rrs')      return 'Avg RRS';
    if (this.activeCard === 'ici')      return 'ICI Score';
    return 'Avg ICS';
  }
  get activeCardDescription(): string {
    if (this.activeCard === 'duration')
      return 'Median interview duration by age group and gender';
    if (this.activeCard === 'rrs')
      return 'Respondent Reliability Score (0–100) by age group and gender';
    if (this.activeCard === 'ici')
      return 'Internal Consistency Index — logical contradiction rate by interviewer';
    return 'Informative Completeness Score by age group and gender';
  }

  // ── KPI card values ────────────────────────────────────────────────────

  // Median, not mean - see INDICATOR_INFO.duration's note for why
  // (durations are right-skewed; the median is the representative "typical
  // interview" statistic, matching the manuscript's own MID definition).
  get overallDuration(): string      { return this.fmtMin(this.durationStats?.overall?.p50 ?? null); }
  get overallDurationCount(): number { return this.durationStats?.overall?.count ?? 0; }
  get overallDurationTier(): StatusBadge | null { return this.thresholdSvc.classifyAid(this.durationStats?.overall?.p50 ?? null); }

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

  // Which raw stat the breakdown table's central "{{ activeCardLabel }} ± σ"
  // column reads from - the median for Duration (see overallDuration's
  // comment), the mean for every other indicator.
  activeCentralValue(stat: DistStat): number | null {
    return this.activeCard === 'duration' ? stat.p50 : stat.avg;
  }

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
  durationRowTier(stat: DistStat): StatusBadge | null { return this.thresholdSvc.classifyAid(stat.p50); }
  iciRowTier(row: InterviewerIci | null): StatusBadge | null { return row ? this.thresholdSvc.classifyIci(row.ici) : null; }

  readonly SVG_W = SVG_W;
  readonly SVG_H = SVG_H;
}
