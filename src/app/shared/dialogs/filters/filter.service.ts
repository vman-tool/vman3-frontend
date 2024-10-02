import { Injectable } from '@angular/core';
import { signal, Signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  private _filterData = signal<{
    start_date: string | undefined;
    end_date: string | undefined;
    locations: string[];
    date_type: string | undefined;
  }>({
    locations: [],
    start_date: undefined,
    end_date: undefined,
    date_type: undefined,
  });

  get filterData(): Signal<{
    start_date: string | undefined;
    end_date: string | undefined;
    locations: string[];
    date_type: string | undefined;
  }> {
    return this._filterData;
  }

  setFilterData(data: {
    start_date: string | undefined;
    end_date: string | undefined;
    locations: string[];
    date_type: string | undefined;
  }) {
    this._filterData.set(data);
  }
}
