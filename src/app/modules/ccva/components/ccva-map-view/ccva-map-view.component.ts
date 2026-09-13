import { AfterViewInit, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
// Same global-script Leaflet setup as maps/components/map-data - see that
// component's comment for why the type-only markercluster import and the
// `declare const L` (rather than `import * as L`) are both needed.
import type { MarkerClusterGroup } from 'leaflet';
import type {} from 'leaflet.markercluster';
declare const L: typeof import('leaflet');
import { BROAD_CATEGORY_COLORS, colorForGroup, colorMapForValues } from '../../utils/ccva-group-colors';
import {
  DonutBreakdownEntry,
  computeBreakdown,
  pieGradient as sharedPieGradient,
  donutClusterIconHtml,
  clusterTooltipHtml,
} from '../../../../shared/utils/cluster-donut';

export interface CcvaMapPoint {
  va_id: string;
  lat: number;
  lng: number;
  gender: string | null;
  age_group: string | null;
  cause1: string | null;
  cause1_broad: string | null;
  cause1_major: string | null;
  locationLevel1: string | null;
}

type ColorableField = 'gender' | 'age_group' | 'cause1_broad' | 'cause1_major' | 'locationLevel1';

// Which map-point field a given Group By dimension colors markers by - only
// the dimensions the (deliberately lightweight) /map-points payload
// actually carries; District/Ward have no per-point field there, so
// markers stay the default color for those.
const COLOR_FIELD_BY_GROUP: Record<string, ColorableField> = {
  gender: 'gender',
  age_group: 'age_group',
  broad: 'cause1_broad',
  major: 'cause1_major',
  region: 'locationLevel1',
};

// A Leaflet marker carrying the CcvaMapPoint it was built from, so a
// cluster's own breakdown can be computed from cluster.getAllChildMarkers()
// without a separate lat/lng-keyed lookup.
type CcvaMarker = L.Marker & { ccvaPoint?: CcvaMapPoint };

type BreakdownEntry = DonutBreakdownEntry;

// Reusable presentational map, scoped down from maps/components/map-data's
// full VA-records map to just plotting a small set of already-filtered CCVA
// points, optionally colored by the active Group By dimension.
@Component({
  standalone: false,
  selector: 'app-ccva-map-view',
  templateUrl: './ccva-map-view.component.html',
  styleUrl: './ccva-map-view.component.scss',
})
export class CcvaMapViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: CcvaMapPoint[] = [];
  @Input() groupBy = 'none';
  @Input() isLoading = false;

  // Off by default - the hover breakdown tooltip is a solid box that covers
  // nearby bubbles, which is exactly the "hinders visibility" complaint this
  // toggle addresses. The bubble coloring itself is unaffected either way.
  showBreakdownPopup = false;

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

  ngAfterViewInit(): void {
    this.map = L.map('ccva-map', { zoomControl: true }).setView([0, 0], 3);
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
    if (!this.mapReady) return;
    if (changes['points'] || changes['groupBy']) {
      this.renderMarkers();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  // Re-runs iconCreateFunction for every visible cluster so the tooltip
  // bind/unbind in clusterIcon() takes effect immediately, without needing
  // to re-add markers (points/groupBy haven't changed, just the toggle).
  onToggleBreakdownPopup(): void {
    this.clusterGroup?.refreshClusters();
  }

  // The field on CcvaMapPoint the active Group By colors by, or undefined
  // when there's nothing to break down (None / District / Ward / Major -
  // dimensions the lightweight map-points payload has no field for).
  private get colorField(): ColorableField | undefined {
    return COLOR_FIELD_BY_GROUP[this.groupBy];
  }

  private valueLabel(value: string): string {
    if (this.groupBy === 'gender' || this.groupBy === 'age_group') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  }

  private markerColor(point: CcvaMapPoint): string {
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
  private breakdownFor(markers: CcvaMarker[]): BreakdownEntry[] {
    const field = this.colorField;
    if (!field) return [];
    return computeBreakdown(
      markers,
      marker => marker.ccvaPoint?.[field],
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
  // on a translucent background (see .ccva-cluster-tooltip in the stylesheet)
  // so that, when a user opts into it via the "Show pop-up" checkbox, it
  // still doesn't fully hide the bubbles/basemap underneath it.
  private clusterTooltip(count: number, breakdown: BreakdownEntry[]): string {
    return clusterTooltipHtml(count, breakdown);
  }

  private clusterIcon(cluster: any): L.DivIcon {
    const childMarkers: CcvaMarker[] = cluster.getAllChildMarkers();
    const count = childMarkers.length;
    // Same size-scaling curve as the Data Map module's own cluster bubbles
    // (map-data.component.ts), for a familiar/consistent feel between the
    // two maps in this app.
    const sz = Math.round(Math.min(64, Math.max(34, 28 + Math.log2(count) * 7)));
    const fs = sz < 42 ? 12 : sz < 54 ? 13 : 14;

    const field = this.colorField;
    if (!field) {
      cluster.unbindTooltip?.();
      return this.plainClusterIcon(count, sz, fs);
    }

    const breakdown = this.breakdownFor(childMarkers);
    if (this.showBreakdownPopup) {
      cluster.bindTooltip(this.clusterTooltip(count, breakdown), {
        direction: 'top',
        sticky: true,
        opacity: 0.9,
        className: 'ccva-cluster-tooltip',
      });
    } else {
      cluster.unbindTooltip?.();
    }
    return this.pieClusterIcon(count, breakdown, sz, fs);
  }

  private renderMarkers(): void {
    if (!this.map || !this.clusterGroup) return;
    this.clusterGroup.clearLayers();

    const field = this.colorField;
    this.currentColorMap = field
      ? colorMapForValues(this.points.map(p => (p[field] as string) || '').filter(Boolean))
      : {};

    for (const point of this.points) {
      if (point.lat == null || point.lng == null) continue;
      const color = this.markerColor(point);
      const popup = `
        <div style="min-width:200px;font-family:sans-serif;font-size:13px;line-height:1.6">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#111827">${point.va_id}</div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Gender</td><td style="font-weight:500">${point.gender ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Age Group</td><td style="font-weight:500">${point.age_group ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Cause 1</td><td style="font-weight:500">${point.cause1 ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Broad Category</td><td style="font-weight:500">${point.cause1_broad ?? '—'}</td></tr>
          </table>
        </div>
      `;
      const marker: CcvaMarker = L.marker([point.lat, point.lng], { icon: this.dotIcon(color) }).bindPopup(popup, { maxWidth: 260 });
      marker.ccvaPoint = point;
      this.clusterGroup.addLayer(marker);
    }

    if (this.points.length > 0) {
      this.map.fitBounds(this.clusterGroup.getBounds(), { padding: [30, 30] });
    }
  }

  // Legend entries for the current coloring - empty when the active Group
  // By dimension has no per-point color field (District/Ward/Major/None).
  get legendEntries(): { label: string; color: string }[] {
    const field = this.colorField;
    if (!field) return [];
    if (this.groupBy === 'broad') {
      return Object.entries(BROAD_CATEGORY_COLORS).map(([label, color]) => ({ label, color }));
    }
    const values = [...new Set(this.points.map(p => (p[field] as string) || '').filter(Boolean))].sort();
    const colorMap = colorMapForValues(values);
    return values.map(value => ({ label: this.valueLabel(value), color: colorMap[value] }));
  }
}
