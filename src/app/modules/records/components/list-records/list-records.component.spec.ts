import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ListRecordsComponent } from './list-records.component';
import { ListRecordsService } from '../../services/list-records/list-records.service';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ListRecordsComponent', () => {
  let component: ListRecordsComponent;
  let fixture: ComponentFixture<ListRecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListRecordsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .compileComponents();

    fixture = TestBed.createComponent(ListRecordsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('searchByOptions', () => {
    it('defaults to the raw option values the backend search_field_map expects, with generic labels', () => {
      expect(component.searchByOptions).toEqual([
        { value: 'vaId', label: 'VA ID' },
        { value: 'instanceId', label: 'Instance ID' },
        { value: 'location_level1', label: 'Region' },
        { value: 'location_level2', label: 'District' },
        { value: 'interviewer_name', label: 'Interviewer' },
      ]);
    });

    it('relabels the location options to this deployment\'s configured admin-level names once settings load', () => {
      const service = TestBed.inject(SettingConfigService);
      jest.spyOn(service, 'getSettingsConfig').mockReturnValue(of({
        system_configs: { admin_level1: 'Zone', admin_level2: 'Council' },
        field_mapping: {},
      } as any));

      fixture.detectChanges(); // triggers ngOnInit -> loadSettingsLabels()

      expect(component.searchByOptions).toEqual([
        { value: 'vaId', label: 'VA ID' },
        { value: 'instanceId', label: 'Instance ID' },
        { value: 'location_level1', label: 'Zone' },
        { value: 'location_level2', label: 'Council' },
        { value: 'interviewer_name', label: 'Interviewer' },
      ]);
    });
  });

  describe('onSearchByChange', () => {
    it('updates searchBy without triggering a reload by itself (Search is still a separate action)', () => {
      fixture.detectChanges();
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();

      component.onSearchByChange('location_level1');

      expect(component.searchBy).toBe('location_level1');
      expect(loadSpy).not.toHaveBeenCalled();
    });
  });

  describe('onSearch / onClearSearch', () => {
    it('onSearch resets to page 1 and reloads', () => {
      fixture.detectChanges();
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();
      component.pageNumber = 3;

      component.onSearch();

      expect(component.pageNumber).toBe(1);
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('onClearSearch empties the search value and reloads', () => {
      fixture.detectChanges();
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();
      component.searchValue = 'uuid:f92c094d';

      component.onClearSearch();

      expect(component.searchValue).toBe('');
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });
  });

  // Broad/Major/Specific Cause + Algorithm - denormalized from whichever
  // CCVA run is marked default (see list_data.py's
  // _VA_RECORDS_CCVA_SORT_FIELDS/_VA_RECORDS_CCVA_FILTERABLE_FIELDS).
  describe('onSort', () => {
    it('sorts ascending on a new column, then toggles to descending on a second click', () => {
      fixture.detectChanges();
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();

      component.onSort('ccvaCauseBroad');
      expect(component.sortColumn).toBe('ccvaCauseBroad');
      expect(component.sortDirection).toBe('asc');

      component.onSort('ccvaCauseBroad');
      expect(component.sortDirection).toBe('desc');

      expect(loadSpy).toHaveBeenCalledTimes(2);
    });

    it('switching to a different column resets to ascending', () => {
      fixture.detectChanges();
      component.sortColumn = 'ccvaCauseBroad';
      component.sortDirection = 'desc';

      component.onSort('ccvaAlgorithm');

      expect(component.sortColumn).toBe('ccvaAlgorithm');
      expect(component.sortDirection).toBe('asc');
    });
  });

  describe('sortIcon', () => {
    it('is a neutral icon for a column that is not the active sort', () => {
      fixture.detectChanges();
      component.sortColumn = 'ccvaCauseBroad';
      expect(component.sortIcon('ccvaAlgorithm')).toContain('arrows-down-up');
    });

    it('reflects the active sort direction', () => {
      fixture.detectChanges();
      component.sortColumn = 'ccvaCauseBroad';
      component.sortDirection = 'asc';
      expect(component.sortIcon('ccvaCauseBroad')).toContain('arrow-up');

      component.sortDirection = 'desc';
      expect(component.sortIcon('ccvaCauseBroad')).toContain('arrow-down');
    });
  });

  describe('CCVA Filter By / Filter Value', () => {
    it('loads the Broad/Major/Specific Cause options on init', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getCcvaFilterOptions').mockReturnValue(of({
        data: { broad: ['Group I: Communicable'], major: ['Malaria'], specific: ['Malaria', 'Stroke'] },
      }));

      fixture.detectChanges();
      component.onFilterByChange('ccvaCauseBroad');

      expect(component.filterValueChoices).toEqual([
        { value: '', label: 'All' },
        { value: 'Group I: Communicable', label: 'Group I: Communicable' },
      ]);
    });

    it('onFilterByChange resets filterValue, rebuilds the value choices, and reloads from page 1', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getCcvaFilterOptions').mockReturnValue(of({
        data: { broad: [], major: ['Malaria'], specific: [] },
      }));
      fixture.detectChanges();
      component.filterValue = 'stale';
      component.pageNumber = 3;
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();

      component.onFilterByChange('ccvaCauseMajor');

      expect(component.filterBy).toBe('ccvaCauseMajor');
      expect(component.filterValue).toBe('');
      expect(component.filterValueChoices).toEqual([
        { value: '', label: 'All' },
        { value: 'Malaria', label: 'Malaria' },
      ]);
      expect(component.pageNumber).toBe(1);
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('loads the Specific Cause options for ccvaCauseSpecific', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getCcvaFilterOptions').mockReturnValue(of({
        data: { broad: [], major: [], specific: ['Malaria', 'Stroke'] },
      }));
      fixture.detectChanges();

      component.onFilterByChange('ccvaCauseSpecific');

      expect(component.filterValueChoices).toEqual([
        { value: '', label: 'All' },
        { value: 'Malaria', label: 'Malaria' },
        { value: 'Stroke', label: 'Stroke' },
      ]);
    });

    it('onFilterValueChange reloads from page 1', () => {
      fixture.detectChanges();
      component.pageNumber = 3;
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();

      component.onFilterValueChange('Malaria');

      expect(component.filterValue).toBe('Malaria');
      expect(component.pageNumber).toBe(1);
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('selecting None clears the value choices back to just "All"', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getCcvaFilterOptions').mockReturnValue(of({
        data: { broad: ['Group I: Communicable'], major: [], specific: [] },
      }));
      fixture.detectChanges();
      component.onFilterByChange('ccvaCauseBroad');

      component.onFilterByChange('none');

      expect(component.filterValueChoices).toEqual([{ value: '', label: 'All' }]);
    });

    it('offers Specific Cause instead of Algorithm as a Filter By choice', () => {
      fixture.detectChanges();
      expect(component.filterByChoices.map(c => c.value)).toEqual([
        'none', 'ccvaCauseBroad', 'ccvaCauseMajor', 'ccvaCauseSpecific',
      ]);
    });
  });

  // Space-saving "Columns" menu - same gesture/placement as CCVA's own
  // Display Data table.
  describe('column visibility', () => {
    it('every toggleable column starts visible', () => {
      fixture.detectChanges();
      expect(component.columnsConfig.every(c => c.visible)).toBe(true);
      expect(component.isColumnVisible('ccvaCauseBroad')).toBe(true);
    });

    it('toggleColumn flips just the given column', () => {
      fixture.detectChanges();

      component.toggleColumn('ccvaCauseBroad');

      expect(component.isColumnVisible('ccvaCauseBroad')).toBe(false);
      expect(component.isColumnVisible('ccvaCauseMajor')).toBe(true);

      component.toggleColumn('ccvaCauseBroad');
      expect(component.isColumnVisible('ccvaCauseBroad')).toBe(true);
    });

    it('columnLabel follows the configured admin-level names for region/district', () => {
      fixture.detectChanges();
      component.locationLevel1Label = 'Zone';
      component.locationLevel2Label = 'Council';

      expect(component.columnLabel('region')).toBe('Zone');
      expect(component.columnLabel('district')).toBe('Council');
      expect(component.columnLabel('ccvaAlgorithm')).toBe('Algorithm');
    });

    it('totalColumns counts the 3 fixed columns plus every currently-visible one', () => {
      fixture.detectChanges();
      const fixedPlusAll = 3 + component.columnsConfig.length;
      expect(component.totalColumns).toBe(fixedPlusAll);

      component.toggleColumn('ccvaCauseBroad');
      component.toggleColumn('gender');

      expect(component.totalColumns).toBe(fixedPlusAll - 2);
    });

    it('toggleColumnsMenu opens and closes the menu', () => {
      fixture.detectChanges();
      expect(component.columnsMenuOpen).toBe(false);

      component.toggleColumnsMenu();
      expect(component.columnsMenuOpen).toBe(true);

      component.toggleColumnsMenu();
      expect(component.columnsMenuOpen).toBe(false);
    });

    it('a click outside the menu closes it; a click inside does not', () => {
      fixture.detectChanges();
      component.columnsMenuOpen = true;

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      component.onDocumentClickForColumnsMenu({ composedPath: () => [outside] } as any);
      expect(component.columnsMenuOpen).toBe(false);

      component.columnsMenuOpen = true;
      const inside = document.createElement('div');
      inside.classList.add('columns-menu-wrapper');
      component.onDocumentClickForColumnsMenu({ composedPath: () => [inside] } as any);
      expect(component.columnsMenuOpen).toBe(true);
    });
  });
});
