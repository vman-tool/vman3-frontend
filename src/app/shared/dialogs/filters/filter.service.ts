import { Injectable } from '@angular/core';
import { signal, Signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  private _filterData = signal<{
    startDate: string | undefined;
    endDate: string | undefined;
    locations: string[];
  }>({
    locations: [],
    startDate: undefined,
    endDate: undefined,
  });

  get filterData(): Signal<{
    startDate: string | undefined;
    endDate: string | undefined;
    locations: string[];
  }> {
    return this._filterData;
  }

  setFilterData(data: {
    startDate: string | undefined;
    endDate: string | undefined;
    locations: string[];
  }) {
    this._filterData.set(data);
  }
}
