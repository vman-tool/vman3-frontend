import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  effect,
  inject,
} from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { MapDataService } from '../../services/map-data.service';
import { FilterService } from '../../../../shared/services/filter.service';

@Component({
  standalone: false,
  selector: 'app-map-data',
  templateUrl: './map-data.component.html',
  styleUrls: ['./map-data.component.scss'],
})
export class MapDataComponent implements OnInit, OnDestroy, AfterViewInit {
  private map!: L.Map;
  private clusterGroup!: L.MarkerClusterGroup;
  private statsControl?: L.Control;
  isLoading = true;
  locations: any[] = [];
  filterData: {
    locations: string[];
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

  constructor(
    private mapDataService: MapDataService,
    private filterService: FilterService
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

  ngOnInit(): void {}

  loadData() {
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

    this.clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: any) =>
        this.createClusterIcon(cluster.getChildCount()),
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

  private updateStatsControl(total: number, sites: number): void {
    if (this.statsControl) {
      this.statsControl.remove();
    }
    const StatsControl = L.Control.extend({
      onAdd(_map: L.Map) {
        const el = L.DomUtil.create('div');
        el.style.cssText =
          'background:rgba(255,255,255,.92);padding:5px 12px;border-radius:5px;' +
          'box-shadow:0 1px 5px rgba(0,0,0,.25);font-size:12px;color:#374151;line-height:1.6';
        el.innerHTML = `<b>${total.toLocaleString()}</b> VA records &nbsp;&bull;&nbsp; <b>${sites.toLocaleString()}</b> sites`;
        return el;
      },
    });
    this.statsControl = new (StatsControl as any)({ position: 'bottomleft' });
    this.statsControl!.addTo(this.map);
  }
}
