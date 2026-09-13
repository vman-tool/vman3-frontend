import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { VaFiltersComponent } from './va-filters.component';
import { FilterService } from '../../../services/filter.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('VaFiltersComponent', () => {
  let component: VaFiltersComponent;
  let fixture: ComponentFixture<VaFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaFiltersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VaFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Renders the filter row without waiting on ngOnInit's real
  // getSettingsConfig()/getUserRoles() HTTP calls (initLocationAccess()) -
  // those are covered elsewhere; here we only care about layout/behavior
  // once loading has finished, so isLoading is set directly.
  function renderFilterRow(): void {
    component.isLoading = false;
    component.locationTypes = [{ label: 'Region', value: 'location_level1', level: 1 }];
    fixture.detectChanges();
  }

  function fieldLabelOrder(): string[] {
    return fixture.debugElement
      .queryAll(By.css('label'))
      .map(el => (el.nativeElement.textContent || '').trim());
  }

  describe('locationFirst layout (default consumers unaffected)', () => {
    it('keeps the original Date Type / Start Date / End Date / Location order when locationFirst is unset', () => {
      renderFilterRow();
      expect(fieldLabelOrder()).toEqual(['Date Type', 'Start Date', 'End Date', 'Location']);
    });

    it('moves Location first, ahead of Date Type/Start/End, when locationFirst is true', () => {
      component.locationFirst = true;
      renderFilterRow();
      expect(fieldLabelOrder()).toEqual(['Location', 'Date Type', 'Start Date', 'End Date']);
    });
  });

  describe('autoApplyLocation', () => {
    it('does not apply filters on a location change by default (Apply-gated, like every other field)', () => {
      const filterService = TestBed.inject(FilterService);
      const setFilterData = jest.spyOn(filterService, 'setFilterData');
      renderFilterRow();
      setFilterData.mockClear();

      component.onLocationSelectionChange([{ field: 'location_level1', field_label: 'Region', label: 'Dodoma', value: 'dodoma' }]);

      expect(setFilterData).not.toHaveBeenCalled();
      expect(component.selectedLocations).toEqual([{ field: 'location_level1', field_label: 'Region', label: 'Dodoma', value: 'dodoma' }]);
    });

    it('applies filters immediately on a location change when autoApplyLocation is true', () => {
      const filterService = TestBed.inject(FilterService);
      const setFilterData = jest.spyOn(filterService, 'setFilterData');
      component.autoApplyLocation = true;
      renderFilterRow();
      setFilterData.mockClear();

      component.onLocationSelectionChange([{ field: 'location_level1', field_label: 'Region', label: 'Dodoma', value: 'dodoma' }]);

      expect(setFilterData).toHaveBeenCalledTimes(1);
      expect(setFilterData.mock.calls[0][0].locations).toEqual([
        { field: 'location_level1', field_label: 'Region', label: 'Dodoma', value: 'dodoma' },
      ]);
    });
  });
});
