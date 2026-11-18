import { AfterViewInit, Component, HostListener, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
// Same global-script Leaflet setup as maps/components/map-data and CCVA's
// own map view - see those components' comments for why the type-only
// markercluster import and the `declare const L` (rather than
// `import * as L`) are both needed.
import type { MarkerClusterGroup } from 'leaflet';
import type {} from 'leaflet.markercluster';
declare const L: typeof import('leaflet');
import { BROAD_CATEGORY_COLORS, colorForGroup, colorMapForValues } from '../../../../shared/utils/group-colors';
import {
  DonutBreakdownEntry,
  computeBreakdown,
  pieGradient as sharedPieGradient,
  donutClusterIconHtml,
  clusterTooltipHtml,
} from '../../../../shared/utils/cluster-donut';
import { DqaThresholdService, TierColor } from '../../../data-quality/services/dqa-threshold.service';

export interface VaRecordMapPoint {
  vaId: string;
  lat: number;
  lng: number;
  region: string | null;
  district: string | null;
  gender: string | null;
  ageGroup: string | null;
  ccvaCauseBroad: string | null;
  ccvaCauseMajor: string | null;
  ccvaCauseSpecific: string | null;
  ccvaAlgorithm: string | null;
  dqaRrs: number | null;
  dqaIcs: number | null;
  dqaIci: number | null;
  dqaAid: number | null;
}

type ColorableField = 'gender' | 'ageGroup' | 'ccvaCauseBroad' | 'ccvaCauseMajor' | 'ccvaCauseSpecific';
type DqaField = 'dqaRrs' | 'dqaIcs' | 'dqaIci' | 'dqaAid';

// The same 5 fields the table's own Group By offers - groupBy's value is
// already the exact point-field name for 3 of them (unlike CCVA, which
// uses its own 'broad'/'major'/'cause_specific' vocabulary); Age Group is
// the one exception ('age_group' groupBy -> 'ageGroup' point field,
// matching the backend's camelCase map-points projection).
const COLOR_FIELD_BY_GROUP: Record<string, ColorableField> = {
  gender: 'gender',
  age_group: 'ageGroup',
  ccvaCauseBroad: 'ccvaCauseBroad',
  ccvaCauseMajor: 'ccvaCauseMajor',
  ccvaCauseSpecific: 'ccvaCauseSpecific',
};

// Table 2's 4 DQA dimensions - groupBy's value is already the exact
// point-field name (dqaRrs/dqaIcs/dqaIci/dqaAid), same convention as
// COLOR_FIELD_BY_GROUP above. Unlike those categorical fields, these hold
// a raw score (the backend's map-points projection deliberately only sends
// raw scores, not tier labels - see list_data.py's
// fetch_va_records_map_points) - DQA_INDICATOR_BY_FIELD below maps each to
// the DqaThresholdService indicator key used to classify that raw score
// into a tier client-side, mirroring the Data Map's own DQA coloring.
const DQA_INDICATOR_BY_FIELD: Record<DqaField, 'rrs' | 'ics' | 'ici' | 'aid'> = {
  dqaRrs: 'rrs',
  dqaIcs: 'ics',
  dqaIci: 'ici',
  dqaAid: 'aid',
};

// A Leaflet marker carrying the VaRecordMapPoint it was built from, so a
// cluster's own breakdown can be computed from cluster.getAllChildMarkers()
// without a separate lat/lng-keyed lookup.
type VaRecordMarker = L.Marker & { vaPoint?: VaRecordMapPoint };

type BreakdownEntry = DonutBreakdownEntry;

// VA Records' own Map view - a clone of CCVA's app-ccva-map-view adapted to
// VaRecordMapPoint/the table's narrower Group By vocabulary (Broad/Major/
// Specific Cause only, no gender/age/region), since the two point shapes
// and groupBy vocabularies don't line up closely enough to share the
// component itself (see the exploration that found this while planning
// this feature).
@Component({
  standalone: false,
  selector: 'app-va-record-map-view',
  templateUrl: './va-record-map-view.component.html',
  styleUrl: './va-record-map-view.component.scss',
})
export class VaRecordMapViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: VaRecordMapPoint[] = [];
  @Input() groupBy = 'none';
  @Input() isLoading = false;

  // Off by default - the hover breakdown tooltip is a solid box that covers
  // nearby bubbles, which is exactly the "hinders visibility" complaint this
  // toggle addresses. The bubble coloring itself is unaffected either way.
  showBreakdownPopup = false;

  // Legend entries clickable to activate/deactivate, same interaction as
  // the Monthly Submission chart's legend - a deactivated value's points
  // are dropped from the map entirely (not just dimmed), the same way
  // Chart.js removes a hidden dataset from the chart.
  private hiddenGroupValues = new Set<string>();

  // Toggled by the maximize button - a plain CSS overlay (see
  // va-record-map-fullscreen in the stylesheet), not the native Fullscreen API.
  isFullscreen = false;

  private map?: L.Map;
  private clusterGroup?: MarkerClusterGroup;
  private mapReady = false;
  // Built once per renderMarkers() pass so individual dots, cluster bubbles,
  // and the legend all agree on the same value->color assignment.
  private currentColorMap: Record<string, string> = {};

  private readonly streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  });

  constructor(private dqaThresholdService: DqaThresholdService) {}

  ngAfterViewInit(): void {
    this.map = L.map('va-record-map', { zoomControl: true }).setView([0, 0], 3);
    this.streetLayer.addTo(this.map);
    this.clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      iconCreateFunction: (cluster: any) => this.clusterIcon(cluster),
    });
    this.map.addLayer(this.clusterGroup);
    this.mapReady = true;
    this.renderMarkers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // A value deactivated under one Group By dimension means nothing once
    // the dimension itself changes (e.g. "Group I" from Broad Category vs.
    // "Malaria" from Specific Cause could collide) - clear rather than
    // carry it over.
    if (changes['groupBy']) {
      this.hiddenGroupValues.clear();
    }
    if (!this.mapReady) return;
    if (changes['points'] || changes['groupBy']) {
      this.renderMarkers();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  // Leaflet caches its container's size at init and after each resize - a
  // plain CSS class toggle (no window resize event) leaves it still sized
  // for the old layout until told otherwise, rendering a blank/mis-clipped
  // map until the user pans/zooms. invalidateSize() re-measures the
  // container; the 0ms delay just waits for the class change to actually
  // reflow the DOM first.
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  @HostListener('document:keydown.escape')
  onEscapeKeydown(): void {
    if (!this.isFullscreen) return;
    this.toggleFullscreen();
  }

  // Re-runs iconCreateFunction for every visible cluster so the tooltip
  // bind/unbind in clusterIcon() takes effect immediately, without needing
  // to re-add markers (points/groupBy haven't changed, just the toggle).
  onToggleBreakdownPopup(): void {
    this.clusterGroup?.refreshClusters();
  }

  // Legend entry click - activate/deactivate a group value, same gesture as
  // the Monthly Submission chart's legend (Chart.js's own default dataset
  // hide/show). There's no per-value Chart.js dataset here to hide/show, so
  // this drops that value's markers from the map directly instead.
  toggleLegendEntry(value: string): void {
    if (this.hiddenGroupValues.has(value)) {
      this.hiddenGroupValues.delete(value);
    } else {
      this.hiddenGroupValues.add(value);
    }
    this.renderMarkers();
  }

  private isPointHidden(point: VaRecordMapPoint): boolean {
    const tier = this.tierFor(point);
    if (tier) return this.hiddenGroupValues.has(tier.label);
    const field = this.colorField;
    const value = field ? point[field] : null;
    return !!value && this.hiddenGroupValues.has(value);
  }

  // The field on VaRecordMapPoint the active Group By colors by, or
  // undefined when nothing is grouped (None) or when it's a DQA dimension
  // (handled by dqaField/tierFor instead).
  private get colorField(): ColorableField | undefined {
    return COLOR_FIELD_BY_GROUP[this.groupBy];
  }

  // The raw-score field a DQA Group By dimension reads from, or undefined
  // for every non-DQA dimension (including None).
  private get dqaField(): DqaField | undefined {
    return (DQA_INDICATOR_BY_FIELD as Record<string, string>)[this.groupBy] ? (this.groupBy as DqaField) : undefined;
  }

  // Classifies a point's raw DQA score into a tier (label + fixed color),
  // the same thresholds/labels used everywhere else DQA scores are shown
  // (General DQA dashboard, Data Map). Returns null outside a DQA Group By,
  // or when this point has no score for it yet (DQA analytics not run).
  private tierFor(point: VaRecordMapPoint): TierColor | null {
    const field = this.dqaField;
    if (!field) return null;
    return this.dqaThresholdService.colorFor(DQA_INDICATOR_BY_FIELD[field], point[field]);
  }

  // Gender comes back raw ("female"/"male") - capitalized here only for
  // display, same as the table's own Filter Value dropdown and Gender
  // column. Age Group (and the CCVA cause fields) are already properly
  // cased from the backend, so this is a no-op for them.
  private valueLabel(value: string): string {
    if (this.groupBy === 'gender') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  }

  private markerColor(point: VaRecordMapPoint): string {
    const tier = this.tierFor(point);
    if (tier) return tier.colorHex;
    const field = this.colorField;
    if (!field) return '#3b82f6';
    const value = point[field];
    if (!value) return '#3b82f6';
    return colorForGroup(this.groupBy, value, this.currentColorMap);
  }

  private dotIcon(color: string): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -9],
    });
  }

  // Every distinct value of the active color field found among a set of
  // markers, tallied and sorted by count (most common first) - the shared
  // basis for a cluster bubble's pie slices AND its hover breakdown, so the
  // two always agree exactly.
  private breakdownFor(markers: VaRecordMarker[]): BreakdownEntry[] {
    if (this.dqaField) {
      return computeBreakdown(
        markers,
        marker => (marker.vaPoint ? this.tierFor(marker.vaPoint)?.label : undefined),
        value => this.currentColorMap[value] ?? '#9ca3af',
      );
    }
    const field = this.colorField;
    if (!field) return [];
    return computeBreakdown(
      markers,
      marker => marker.vaPoint?.[field] as string | null | undefined,
      value => colorForGroup(this.groupBy, value, this.currentColorMap),
      value => this.valueLabel(value),
    );
  }

  private pieGradient(breakdown: BreakdownEntry[], total: number): string {
    return sharedPieGradient(breakdown, total);
  }

  private plainClusterIcon(count: number, sz: number, fs: number): L.DivIcon {
    const bg = count < 10 ? '#3b82f6' : count < 50 ? '#f59e0b' : '#ef4444';
    return L.divIcon({
      className: '',
      html: `<div style="width:${sz}px;height:${sz}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${bg};border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);color:#fff;font:700 ${fs}px/1 sans-serif">${count}</div>`,
      iconSize: [sz, sz],
      iconAnchor: [sz / 2, sz / 2],
    });
  }

  // A donut colored by the proportion of each group value among this
  // cluster's points, with the total count badged in the middle - the
  // "donut chart bubble" that makes a concentration of e.g. Group I:
  // Communicable visible at a glance without having to open anything. The
  // center is a genuine hole (via a CSS mask cut out of the ring, not just
  // an inner disc painted a different color) so the basemap underneath
  // shows straight through it instead of being covered by anything.
  private pieClusterIcon(count: number, breakdown: BreakdownEntry[], sz: number, fs: number): L.DivIcon {
    return L.divIcon({
      className: '',
      html: donutClusterIconHtml(count, breakdown, sz, fs),
      iconSize: [sz, sz],
      iconAnchor: [sz / 2, sz / 2],
    });
  }

  // Kept deliberately compact (small swatch, tight row spacing) and rendered
  // on a translucent background (see .va-record-cluster-tooltip in the
  // stylesheet) so that, when a user opts into it via the "Show pop-up"
  // checkbox, it still doesn't fully hide the bubbles/basemap underneath it.
  private clusterTooltip(count: number, breakdown: BreakdownEntry[]): string {
    return clusterTooltipHtml(count, breakdown);
  }

  private clusterIcon(cluster: any): L.DivIcon {
    const childMarkers: VaRecordMarker[] = cluster.getAllChildMarkers();
    const count = childMarkers.length;
    // Same size-scaling curve as the Data Map module's own cluster bubbles
    // (map-data.component.ts) and CCVA's own map, for a familiar/consistent
    // feel between the maps in this app.
    const sz = Math.round(Math.min(64, Math.max(34, 28 + Math.log2(count) * 7)));
    const fs = sz < 42 ? 12 : sz < 54 ? 13 : 14;

    if (!this.colorField && !this.dqaField) {
      cluster.unbindTooltip?.();
      return this.plainClusterIcon(count, sz, fs);
    }

    const breakdown = this.breakdownFor(childMarkers);
    if (this.showBreakdownPopup) {
      cluster.bindTooltip(this.clusterTooltip(count, breakdown), {
        direction: 'top',
        sticky: true,
        opacity: 0.9,
        className: 'va-record-cluster-tooltip',
      });
    } else {
      cluster.unbindTooltip?.();
    }
    return this.pieClusterIcon(count, breakdown, sz, fs);
  }

  private renderMarkers(): void {
    if (!this.map || !this.clusterGroup) return;
    this.clusterGroup.clearLayers();

    const dqaField = this.dqaField;
    const field = this.colorField;
    if (dqaField) {
      this.currentColorMap = Object.fromEntries(
        this.dqaThresholdService.legendFor(DQA_INDICATOR_BY_FIELD[dqaField]).map(t => [t.label, t.colorHex])
      );
    } else {
      this.currentColorMap = field
        ? colorMapForValues(this.points.map(p => (p[field] as string) || '').filter(Boolean))
        : {};
    }

    let visibleCount = 0;
    for (const point of this.points) {
      if (point.lat == null || point.lng == null) continue;
      if (this.isPointHidden(point)) continue;
      visibleCount++;
      const color = this.markerColor(point);
      const popup = `
        <div style="min-width:200px;font-family:sans-serif;font-size:13px;line-height:1.6">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#111827">${point.vaId}</div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Region</td><td style="font-weight:500">${point.region ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">District</td><td style="font-weight:500">${point.district ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Gender</td><td style="font-weight:500">${point.gender ? point.gender.charAt(0).toUpperCase() + point.gender.slice(1) : '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Age Group</td><td style="font-weight:500">${point.ageGroup ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Broad Category</td><td style="font-weight:500">${point.ccvaCauseBroad ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Specific Cause</td><td style="font-weight:500">${point.ccvaCauseSpecific ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">RRS</td><td style="font-weight:500">${this.formatDqaScore('dqaRrs', point)}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">ICS</td><td style="font-weight:500">${this.formatDqaScore('dqaIcs', point)}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">ICI</td><td style="font-weight:500">${this.formatDqaScore('dqaIci', point)}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">AID</td><td style="font-weight:500">${this.formatDqaScore('dqaAid', point)}</td></tr>
          </table>
        </div>
      `;
      const marker: VaRecordMarker = L.marker([point.lat, point.lng], { icon: this.dotIcon(color) }).bindPopup(popup, { maxWidth: 260 });
      marker.vaPoint = point;
      this.clusterGroup.addLayer(marker);
    }

    if (visibleCount > 0) {
      this.map.fitBounds(this.clusterGroup.getBounds(), { padding: [30, 30] });
    }
  }

  // Popup row for one of the 4 DQA scores - shown on every point
  // regardless of the active Group By (same reasoning as Broad/Specific
  // Cause already being shown unconditionally above), with its tier label
  // from DqaThresholdService alongside the raw score. "—" when DQA
  // analytics hasn't been run yet for this record (null score).
  private formatDqaScore(field: DqaField, point: VaRecordMapPoint): string {
    const raw = point[field];
    if (raw === null || raw === undefined) return '—';
    const indicator = DQA_INDICATOR_BY_FIELD[field];
    const tier = this.dqaThresholdService.colorFor(indicator, raw);
    const value = indicator === 'aid' ? `${Math.round(raw)} min` : `${raw.toFixed(1)}%`;
    return tier ? `${value} (${tier.label})` : value;
  }

  // Legend entries for the current coloring - empty when nothing is
  // grouped (None). `value` is the raw group value (what
  // toggleLegendEntry()/hiddenGroupValues key on); `hidden` drives the
  // clicked-to-deactivate styling.
  get legendEntries(): { label: string; color: string; value: string; hidden: boolean }[] {
    const dqaField = this.dqaField;
    if (dqaField) {
      return this.dqaThresholdService.legendFor(DQA_INDICATOR_BY_FIELD[dqaField]).map(t => ({
        label: t.label, color: t.colorHex, value: t.label, hidden: this.hiddenGroupValues.has(t.label),
      }));
    }
    const field = this.colorField;
    if (!field) return [];
    if (this.groupBy === 'ccvaCauseBroad') {
      return Object.entries(BROAD_CATEGORY_COLORS).map(([label, color]) => ({
        label, color, value: label, hidden: this.hiddenGroupValues.has(label),
      }));
    }
    const values = [...new Set(this.points.map(p => (p[field] as string) || '').filter(Boolean))].sort();
    const colorMap = colorMapForValues(values);
    return values.map(value => ({
      label: this.valueLabel(value), color: colorMap[value], value, hidden: this.hiddenGroupValues.has(value),
    }));
  }
}
