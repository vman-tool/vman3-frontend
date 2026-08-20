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
    this._filterData.set(data);
  }
}
