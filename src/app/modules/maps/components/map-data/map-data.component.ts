import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  NgZone,
  effect,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
// L is loaded as a global script (angular.json scripts[]) so that
// leaflet.markercluster can augment window.L before the app bundle runs.
// esbuild's ESM/CJS module interop creates separate instances, so the
// side-effect import 'leaflet.markercluster' does NOT augment the ESM L.
// The type-only import below triggers @types/leaflet.markercluster's
// `declare module "leaflet"` augmentation without emitting any runtime code.
import type { MarkerClusterGroup } from 'leaflet';
import type {} from 'leaflet.markercluster';
declare const L: typeof import('leaflet');
import { MapDataService } from '../../services/map-data.service';
import { FilterService } from '../../../../shared/services/filter.service';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';
import { GeneralDqaService, DqaSnapshot } from 'app/modules/data-quality/services/general-dqa.service';
import { DqaThresholdService, TierColor } from 'app/modules/data-quality/services/dqa-threshold.service';
import { computeBreakdown, donutClusterIconHtml, clusterTooltipHtml } from 'app/shared/utils/cluster-donut';

export type DqaIndicator = 'none' | 'rrs' | 'ics' | 'ici' | 'aid';

interface DqaMapPoint {
  va_id: string;
  lat: number;
  lng: number;
  rrs: number | null;
  ics: number | null;
  ici: number | null;
  aid: number | null;
}

type DqaMarker = L.Marker & { dqaTier?: TierColor };

@Component({
  standalone: false,
  selector: 'app-map-data',
  templateUrl: './map-data.component.html',
  styleUrls: ['./map-data.component.scss'],
})
export class MapDataComponent implements OnInit, OnDestroy, AfterViewInit {
  private map!: L.Map;
  private clusterGroup!: MarkerClusterGroup;
  private statsControl?: L.Control;
  isLoading = true;
  locations: any[] = [];
  filterData: {
    locations: LocationSelection[];
    start_date?: string;
    end_date?: string;
    date_type?: string;
    ccva_graph_db_source: boolean;
  } = {
    locations: [],
    start_date: undefined,
    end_date: undefined,
    date_type: undefined,
    ccva_graph_db_source: true,
  };

  private readonly streetLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }
  );

  private readonly satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
    }
  );

  private readonly topoLayer = L.tileLayer(
    'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    {
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
      maxZoom: 17,
    }
  );

  private readonly customIcon = L.divIcon({
    className: '',
    html: '<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid rgba(255,255,255,0.9);box-shadow:0 1px 6px rgba(0,0,0,0.45)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });

  title: string = 'VA Data Map';

  // DQA-indicator map coloring, offered as a floating Leaflet control (see
  // buildDqaControl()) stacked underneath the Street/Satellite/Topographic
  // switcher, not a toolbar field - selectable but disabled until a
  // snapshot actually exists (see dqaAvailable), since the underlying data
  // is only ever as fresh as the last nightly/manual DQA recompute.
  dqaIndicator: DqaIndicator = 'none';
  dqaAvailable = false;
  dqaComputedAt: string | null = null;
  readonly dqaIndicatorOptions: { value: DqaIndicator; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'rrs', label: 'RRS' },
    { value: 'ics', label: 'ICS' },
    { value: 'ici', label: 'ICI' },
    { value: 'aid', label: 'AID' },
  ];
  dqaLegendEntries: TierColor[] = [];
  // Each indicator's overall average, shown right on its radio label (e.g.
  // "RRS 84.1") - read straight from the same cached DQA snapshot that
  // already gates dqaAvailable, so it refreshes automatically every time
  // that snapshot does (the next nightly/manual recompute), with no
  // separate fetch or polling of its own.
  dqaAverages: Partial<Record<'rrs' | 'ics' | 'ici' | 'aid', number | null>> = {};
  private dqaControl?: L.Control;
  private dqaColorByLabel: Record<string, string> = {};
  private dqaPoints: DqaMapPoint[] = [];

  constructor(
    private mapDataService: MapDataService,
    private filterService: FilterService,
    private generalDqaService: GeneralDqaService,
    private dqaThresholdService: DqaThresholdService,
    private ngZone: NgZone,
    private datePipe: DatePipe
  ) {
    this.filterService = inject(FilterService);
    this.setupEffect();
  }

  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadData();
    });
  }

  ngOnInit(): void {
    this.generalDqaService.getAnalyticsSnapshot().subscribe(res => {
      const snapshot: DqaSnapshot | null = res?.data ?? null;
      this.dqaAvailable = snapshot?.status === 'completed';
      this.dqaComputedAt = snapshot?.computed_at ?? null;
      this.dqaAverages = {
        rrs: snapshot?.rrs?.overall?.avg ?? null,
        ics: snapshot?.ics?.overall?.avg ?? null,
        // ICI's snapshot shape is IciStats, not GroupedStats - its overall
        // figure is a top-level field, not nested under .overall.avg.
        ici: snapshot?.ici?.overall_ici ?? null,
        aid: snapshot?.aid?.overall?.avg ?? null,
      };
      this.buildDqaControl();
    });
  }

  onDqaIndicatorChange(): void {
    if (this.dqaIndicator === 'none') {
      this.loadData();
      return;
    }
    this.dqaLegendEntries = this.dqaThresholdService.legendFor(this.dqaIndicator);
    this.dqaColorByLabel = Object.fromEntries(this.dqaLegendEntries.map(t => [t.label, t.colorHex]));
    this.loadDqaPoints();
  }

  private loadDqaPoints(): void {
    this.isLoading = true;
    this.mapDataService
      .getDqaMapPoints(this.filterData.start_date, this.filterData.end_date, this.filterData.locations)
      .subscribe({
        next: (res) => {
          this.dqaPoints = res.data || [];
          this.addDqaMarkers();
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  loadData() {
    // A location/date filter change re-runs this (see setupEffect's
    // effect()) regardless of which view is active - stay in DQA mode
    // across a filter change instead of silently reverting to plain
    // markers.
    if (this.dqaIndicator !== 'none') {
      this.loadDqaPoints();
      return;
    }
    this.isLoading = true;
    this.mapDataService
      .getMapRecordsData(
        this.filterData.start_date,
        this.filterData.end_date,
        this.filterData.locations,
        this.filterData.date_type
      )
      .subscribe({
        next: async (data) => {
          this.locations = data.data;
          await this.addMarkers();
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private createClusterIcon(count: number): L.DivIcon {
    const sz = Math.round(Math.min(64, Math.max(34, 28 + Math.log2(count) * 7)));
    const fs = sz < 42 ? 12 : sz < 54 ? 13 : 14;
    const bg = count < 10 ? '#3b82f6' : count < 50 ? '#f59e0b' : '#ef4444';
    return L.divIcon({
      className: '',
      html: `<div style="width:${sz}px;height:${sz}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${bg};border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);color:#fff;font:700 ${fs}px/1 sans-serif;cursor:pointer">${count}</div>`,
      iconSize: [sz, sz],
      iconAnchor: [sz / 2, sz / 2],
    });
  }

  // DQA-tier-donut cluster icon - same drawing logic as the CCVA map's
  // Group By coloring (frontend/.../shared/utils/cluster-donut.ts), just
  // tallying each cluster's DqaMarker.dqaTier instead of a CCVA field.
  private dqaClusterIcon(cluster: any): L.DivIcon {
    const childMarkers: DqaMarker[] = cluster.getAllChildMarkers();
    const count = childMarkers.length;
    const sz = Math.round(Math.min(64, Math.max(34, 28 + Math.log2(count) * 7)));
    const fs = sz < 42 ? 12 : sz < 54 ? 13 : 14;

    const breakdown = computeBreakdown(
      childMarkers,
      m => m.dqaTier?.label,
      label => this.dqaColorByLabel[label] ?? '#9ca3af',
    );
    cluster.bindTooltip(clusterTooltipHtml(count, breakdown), {
      direction: 'top', sticky: true, opacity: 0.9, className: 'dqa-cluster-tooltip',
    });
    return L.divIcon({
      className: '',
      html: donutClusterIconHtml(count, breakdown, sz, fs),
      iconSize: [sz, sz],
      iconAnchor: [sz / 2, sz / 2],
    });
  }

  private initMap(): void {
    this.map = L.map('map', { zoomControl: true }).setView([0, 0], 3);
    this.streetLayer.addTo(this.map);

    L.control
      .layers(
        {
          'Street': this.streetLayer,
          'Satellite': this.satelliteLayer,
          'Topographic': this.topoLayer,
        },
        {},
        { position: 'topright', collapsed: false }
      )
      .addTo(this.map);

    // Added after the layers control above so Leaflet stacks it directly
    // underneath in the same (topright) corner - same mechanism the layers
    // control itself uses, so no manual pixel offset is needed.
    this.buildDqaControl();

    this.clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: any) =>
        this.dqaIndicator === 'none'
          ? this.createClusterIcon(cluster.getChildCount())
          : this.dqaClusterIcon(cluster),
    });
    this.map.addLayer(this.clusterGroup);
  }

  private async addMarkers(): Promise<void> {
    if (!this.map || !this.clusterGroup) return;
    this.clusterGroup.clearLayers();

    const siteMap = new Map<string, any[]>();
    for (const loc of this.locations) {
      if (!loc.coordinates || loc.coordinates.length < 2) continue;
      const [lng, lat] = loc.coordinates;
      const key = `${lat},${lng}`;
      if (!siteMap.has(key)) siteMap.set(key, []);
      siteMap.get(key)!.push(loc);
    }

    siteMap.forEach((records, key) => {
      const [lat, lng] = key.split(',').map(Number);
      const first = records[0];
      const count = records.length;

      const extraNote =
        count > 1
          ? `<div style="margin-top:6px;padding:4px 8px;background:#f3f4f6;border-radius:4px;font-size:11px;color:#6b7280">${count} interviews at this site</div>`
          : '';

      const popupContent = `
        <div style="min-width:210px;font-family:sans-serif;font-size:13px;line-height:1.6">
          <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#111827">VA Interview Site</div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Region</td><td style="font-weight:500">${first.location ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">District</td><td style="font-weight:500">${first.district ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Interviewer</td><td style="font-weight:500">${first.interviewer ?? '—'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 8px 2px 0;white-space:nowrap">Date</td><td style="font-weight:500">${first.date ? new Date(first.date).toLocaleDateString() : '—'}</td></tr>
          </table>
          ${extraNote}
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: this.customIcon }).bindPopup(
        popupContent,
        { maxWidth: 260 }
      );
      this.clusterGroup.addLayer(marker);
    });

    if (siteMap.size > 0) {
      this.map.fitBounds(this.clusterGroup.getBounds(), { padding: [30, 30] });
    }

    this.updateStatsControl(this.locations.length, siteMap.size);
    this.isLoading = false;
  }

  private updateStatsControl(total: number, sites: number, sitesLabel = 'sites'): void {
    if (this.statsControl) {
      this.statsControl.remove();
    }
    const StatsControl = L.Control.extend({
      onAdd(_map: L.Map) {
        const el = L.DomUtil.create('div');
        el.style.cssText =
          'background:rgba(255,255,255,.92);padding:5px 12px;border-radius:5px;' +
          'box-shadow:0 1px 5px rgba(0,0,0,.25);font-size:12px;color:#374151;line-height:1.6';
        el.innerHTML = `<b>${total.toLocaleString()}</b> VA records &nbsp;&bull;&nbsp; <b>${sites.toLocaleString()}</b> ${sitesLabel}`;
        return el;
      },
    });
    this.statsControl = new (StatsControl as any)({ position: 'bottomleft' });
    this.statsControl!.addTo(this.map);
  }

  // "RRS" -> "RRS 84.1" once its average is known (AID's is in minutes, so
  // it gets a unit suffix to avoid reading like a 0-100 score); "None" and
  // any indicator with no computable average (e.g. a field missing from
  // this deployment's ODK form) keep the bare label.
  private dqaRadioLabel(indicator: DqaIndicator, label: string): string {
    if (indicator === 'none') return label;
    const avg = this.dqaAverages[indicator];
    if (avg === null || avg === undefined) return label;
    return indicator === 'aid' ? `${label} ${avg.toFixed(1)} min` : `${label} ${avg.toFixed(1)}`;
  }

  // A floating Leaflet control (same "raw DOM + native events" pattern as
  // updateStatsControl below) rather than an Angular-templated dropdown -
  // added right after the layers control in initMap() so it stacks
  // underneath the Street/Satellite/Topographic switcher automatically via
  // Leaflet's own same-corner control stacking, with no pixel math needed.
  // Rebuilt whenever availability resolves (see ngOnInit) so the disabled
  // state/hint text/averages stay in sync with the latest DQA snapshot
  // regardless of whether that resolves before or after the map itself has
  // initialized.
  private buildDqaControl(): void {
    if (!this.map) return;
    if (this.dqaControl) {
      this.dqaControl.remove();
    }

    const self = this;
    const DqaControl = L.Control.extend({
      onAdd(_map: L.Map) {
        // Radio list, not a dropdown - all 4 indicators (plus None) visible
        // at once, same presentation as the Street/Satellite/Topographic
        // switcher right above it.
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control-layers');
        container.style.cssText =
          'background:rgba(255,255,255,.95);padding:8px 10px;border-radius:5px;' +
          'box-shadow:0 1px 5px rgba(0,0,0,.25);font-size:12px;color:#374151;min-width:150px';
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        const heading = L.DomUtil.create('div', '', container);
        heading.style.cssText = 'font-weight:600;margin-bottom:6px;color:#374151';
        heading.textContent = 'DQA Indicator';

        const radioName = 'dqaIndicatorRadio';
        for (const opt of self.dqaIndicatorOptions) {
          const row = L.DomUtil.create('label', '', container);
          row.style.cssText =
            'display:flex;align-items:center;gap:6px;padding:2px 0;' +
            (self.dqaAvailable ? 'cursor:pointer' : 'cursor:not-allowed;opacity:0.6');

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = radioName;
          radio.value = opt.value;
          radio.checked = opt.value === self.dqaIndicator;
          radio.disabled = !self.dqaAvailable;
          radio.addEventListener('change', () => {
            // Native DOM event, outside Angular's zone - without this,
            // dqaIndicator/dqaLegendEntries would update but nothing bound
            // to them (the legend overlay, isLoading spinner) would re-render.
            self.ngZone.run(() => {
              self.dqaIndicator = opt.value;
              self.onDqaIndicatorChange();
            });
          });
          row.appendChild(radio);

          const text = document.createElement('span');
          text.textContent = self.dqaRadioLabel(opt.value, opt.label);
          row.appendChild(text);
        }

        const hint = L.DomUtil.create('div', '', container);
        hint.style.cssText = 'font-size:10px;color:#9ca3af;margin-top:6px';
        hint.textContent = self.dqaAvailable
          ? (self.dqaComputedAt ? `As of ${self.datePipe.transform(self.dqaComputedAt, 'MMM d, HH:mm')}` : '')
          : 'Not available yet';

        return container;
      },
    });

    this.dqaControl = new (DqaControl as any)({ position: 'topright' });
    this.dqaControl!.addTo(this.map);
  }

  private dqaDotIcon(colorHex: string): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${colorHex};border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -9],
    });
  }

  private addDqaMarkers(): void {
    if (!this.map || !this.clusterGroup) return;
    const indicator = this.dqaIndicator;
    if (indicator === 'none') return;

    this.clusterGroup.clearLayers();

    let plotted = 0;
    for (const point of this.dqaPoints) {
      if (point.lat == null || point.lng == null) continue;
      const value = point[indicator];
      const tier = this.dqaThresholdService.colorFor(indicator, value);
      const colorHex = tier?.colorHex ?? '#9ca3af';

      const popup = `
        <div style="min-width:180px;font-family:sans-serif;font-size:13px;line-height:1.6">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#111827">${point.va_id}</div>
          <div style="color:#6b7280">${indicator.toUpperCase()}: <strong style="color:#111827">${value != null ? Math.round(value) : '—'}</strong>${tier ? ` (${tier.label})` : ''}</div>
        </div>
      `;
      const marker: DqaMarker = L.marker([point.lat, point.lng], { icon: this.dqaDotIcon(colorHex) })
        .bindPopup(popup, { maxWidth: 240 });
      marker.dqaTier = tier ?? undefined;
      this.clusterGroup.addLayer(marker);
      plotted++;
    }

    if (plotted > 0) {
      this.map.fitBounds(this.clusterGroup.getBounds(), { padding: [30, 30] });
    }

    this.updateStatsControl(this.dqaPoints.length, plotted, 'plotted (with GPS)');
    this.isLoading = false;
  }
}
