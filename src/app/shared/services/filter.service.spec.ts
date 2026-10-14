import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter.service';

const DEFAULT_DATA = {
  locations: [],
  start_date: undefined,
  end_date: undefined,
  date_type: undefined,
  ccva_graph_db_source: true,
};

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilterService);
  });

  it('starts with the default filter data', () => {
    expect(service.filterData()).toEqual(DEFAULT_DATA);
  });

  it('setFilterData with a value identical to the current one does not notify readers', () => {
    // Regression test: VaFiltersComponent resets to these exact default
    // values (as a brand-new object literal) on every one of its own
    // mounts. Before this fix, that was always treated as a change
    // (signals compare by reference), re-triggering every effect/consumer
    // that reads filterData() even though nothing actually changed - the
    // root cause of charts reloading/flickering multiple times per page.
    let runs = 0;
    TestBed.runInInjectionContext(() => {
      const { effect } = require('@angular/core');
      effect(() => {
        service.filterData();
        runs++;
      });
    });
    TestBed.flushEffects();
    expect(runs).toBe(1);

    service.setFilterData({ ...DEFAULT_DATA });
    TestBed.flushEffects();

    expect(runs).toBe(1);
  });

  it('setFilterData with an actually different value does update and notify', () => {
    let runs = 0;
    TestBed.runInInjectionContext(() => {
      const { effect } = require('@angular/core');
      effect(() => {
        service.filterData();
        runs++;
      });
    });
    TestBed.flushEffects();
    expect(runs).toBe(1);

    service.setFilterData({ ...DEFAULT_DATA, start_date: '2026-01-01' });
    TestBed.flushEffects();

    expect(runs).toBe(2);
    expect(service.filterData().start_date).toBe('2026-01-01');
  });

  it('setFilterData with different locations (same other fields) is treated as a real change', () => {
    service.setFilterData({
      ...DEFAULT_DATA,
      locations: [{ field: 'province', value: 'Dodoma' } as any],
    });

    expect(service.filterData().locations).toEqual([{ field: 'province', value: 'Dodoma' }]);
  });
});
