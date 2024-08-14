import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  effect,
  inject,
} from '@angular/core';
import * as L from 'leaflet';
import { MapDataService } from '../../services/map-data.service'; // Adjust the path as needed
import { FilterService } from '../../../../shared/dialogs/filters/filter.service';

@Component({
  selector: 'app-map-data',
  templateUrl: './map-data.component.html',
  styleUrls: ['./map-data.component.scss'],
})
export class MapDataComponent implements OnInit, OnDestroy, AfterViewInit {
  private map: any;
  isLoading = true;
  locations: any[] = [];
  filterData: { locations: string[]; startDate?: string; endDate?: string } = {
    locations: [],
    startDate: undefined,
    endDate: undefined,
  };
  private customIcon = L.icon({
    iconUrl: 'assets/icons/marker.svg', // Path to your custom marker icon
    iconSize: [38, 38], // Size of the icon
    iconAnchor: [19, 38], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -38], // Point from which the popup should open relative to the iconAnchor
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
        this.filterData.startDate,
        this.filterData.endDate,
        this.filterData.locations
      )
      .subscribe(async (data) => {
        this.locations = data.data;
        console.log('Fetched locations:', this.locations); // Log locations data
        await this.addMarkers();
        // await for 1 second to ensure the map is loaded before setting isLoading to false
        setTimeout(() => {
          // this.isLoading = false;
        }, 1000);
        // this.isLoading = false;
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

  private initMap(): void {
    this.map = L.map('map').setView([0, 0], 3); // Initialize map centered at [0, 0] with zoom level 2
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  private async addMarkers(): Promise<void> {
    const bounds = L.latLngBounds([]);
    console.log('Adding markers for locations:', this.locations); // Log before adding markers

    if (this.locations.length > 0) {
      const uniqueMarkers = new Set();

      for (const [index, location] of this.locations.entries()) {
        const [longitude, latitude] = location.coordinates;
        const markerKey = `${latitude},${longitude}`;

        if (uniqueMarkers.has(markerKey)) {
          console.warn(
            `Duplicate marker for ${markerKey} found at index ${index + 1}`
          );
        } else {
          uniqueMarkers.add(markerKey);
          console.log(`Adding marker ${index + 1}:`, latitude, longitude); // Log each marker's coordinates

          const popupContent = `
  <div class="p-4 bg-transparent rounded-lg  w-96">
    <div class="mb-2 text-lg font-bold flex items-center">
      <img src="assets/icons/marker.svg" class="h-6 w-6 mr-2" />
      Marker Details
    </div>
    <div class="grid grid-cols-2 gap-4 text-gray-600">
      <div class="col-span-2">
        <span class="font-semibold">Region:</span> ${location.location}
      </div>
      <div class="col-span-2">
        <span class="font-semibold">District:</span> ${location.district}
      </div>
      <div class="col-span-2">
        <span class="font-semibold">Date:</span> ${new Date(
          location.date
        ).toLocaleDateString()}
      </div>
      <div class="col-span-2">
        <span class="font-semibold">Interviewer:</span> ${location.interviewer}
      </div>
      <div class="col-span-2">
        <span class="font-semibold">Device ID:</span> ${location.deviceid}
      </div>
    </div>
  </div>
`;

          const marker = L.marker([latitude, longitude], {
            icon: this.customIcon,
          })
            .bindPopup(popupContent)
            .addTo(this.map);
          bounds.extend(marker.getLatLng());
        }
      }

      console.log('Bounds after adding markers:', bounds); // Log bounds
      this.map.fitBounds(bounds); // Fit the map to the bounds of all markers
    }
  }
}
