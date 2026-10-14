import { Injectable } from '@angular/core';
import { signal, Signal } from '@angular/core';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  private _filterData = signal<{
    start_date: string | undefined;
    end_date: string | undefined;
    locations: LocationSelection[];
    date_type: string | undefined;
    ccva_graph_db_source: boolean;
  }>({
    locations: [],
    start_date: undefined,
    end_date: undefined,
    date_type: undefined,
    ccva_graph_db_source: true,
  });

  get filterData(): Signal<{
    start_date: string | undefined;
    end_date: string | undefined;
    locations: LocationSelection[];
    date_type: string | undefined;
    ccva_graph_db_source: boolean;
  }> {
    return this._filterData;
  }

  setFilterData(data: {
    start_date: string | undefined;
    end_date: string | undefined;
    locations: LocationSelection[];
    date_type: string | undefined;
    ccva_graph_db_source: boolean;
  }) {
    // VaFiltersComponent resets this to the same default values on every one
    // of its own mounts (every page that embeds <app-va-filters>), as a new
    // object literal each time. Signals compare by reference, so that
    // "reset to the same defaults" was always treated as a change, firing
    // every effect/subscriber that reads filterData() again even though
    // nothing actually changed - the root cause of charts on those pages
    // reloading/re-rendering multiple times on a single page load.
    if (JSON.stringify(this._filterData()) === JSON.stringify(data)) {
      return;
    }
    this._filterData.set(data);
  }
}
