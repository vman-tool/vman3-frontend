import { AfterViewInit, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
// Same global-script Leaflet setup as maps/components/map-data - see that
// component's comment for why the type-only markercluster import and the
// `declare const L` (rather than `import * as L`) are both needed.
import type { MarkerClusterGroup } from 'leaflet';
import type {} from 'leaflet.markercluster';
declare const L: typeof import('leaflet');
import { BROAD_CATEGORY_COLORS, colorForGroup, colorMapForValues } from '../../utils/ccva-group-colors';

export interface CcvaMapPoint {
  va_id: string;
  lat: number;
  lng: number;
  gender: string | null;
  age_group: string | null;
  cause1: string | null;
  cause1_broad: string | null;
  locationLevel1: string | null;
}

type ColorableField = 'gender' | 'age_group' | 'cause1_broad' | 'locationLevel1';

// Which map-point field a given Group By dimension colors markers by - only
// the dimensions the (deliberately lightweight) /map-points payload
// actually carries; District/Ward/Major Category have no per-point field
// there, so markers stay the default color for those.
const COLOR_FIELD_BY_GROUP: Record<string, ColorableField> = {
  gender: 'gender',
  age_group: 'age_group',
  broad: 'cause1_broad',
  region: 'locationLevel1',
};

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

  private map?: L.Map;
  private clusterGroup?: MarkerClusterGroup;
  private mapReady = false;

  private readonly streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  });

  ngAfterViewInit(): void {
    this.map = L.map('ccva-map', { zoomControl: true }).setView([0, 0], 3);
    this.streetLayer.addTo(this.map);
    this.clusterGroup = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60 });
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

  private markerColor(point: CcvaMapPoint, colorMap: Record<string, string>): string {
    const field = COLOR_FIELD_BY_GROUP[this.groupBy];
    if (!field) return '#3b82f6';
    const value = point[field];
    if (!value) return '#3b82f6';
    return colorForGroup(this.groupBy, value, colorMap);
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

  private renderMarkers(): void {
    if (!this.map || !this.clusterGroup) return;
    this.clusterGroup.clearLayers();

    const field = COLOR_FIELD_BY_GROUP[this.groupBy];
    const colorMap = field
      ? colorMapForValues(this.points.map(p => (p[field] as string) || '').filter(Boolean))
      : {};

    for (const point of this.points) {
      if (point.lat == null || point.lng == null) continue;
      const color = this.markerColor(point, colorMap);
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
      const marker = L.marker([point.lat, point.lng], { icon: this.dotIcon(color) }).bindPopup(popup, { maxWidth: 260 });
      this.clusterGroup.addLayer(marker);
    }

    if (this.points.length > 0) {
      this.map.fitBounds(this.clusterGroup.getBounds(), { padding: [30, 30] });
    }
  }

  // Legend entries for the current coloring - empty when the active Group
  // By dimension has no per-point color field (District/Ward/Major/None).
  get legendEntries(): { label: string; color: string }[] {
    const field = COLOR_FIELD_BY_GROUP[this.groupBy];
    if (!field) return [];
    if (this.groupBy === 'broad') {
      return Object.entries(BROAD_CATEGORY_COLORS).map(([label, color]) => ({ label, color }));
    }
    const values = [...new Set(this.points.map(p => (p[field] as string) || '').filter(Boolean))].sort();
    const colorMap = colorMapForValues(values);
    return values.map(label => ({ label, color: colorMap[label] }));
  }
}
