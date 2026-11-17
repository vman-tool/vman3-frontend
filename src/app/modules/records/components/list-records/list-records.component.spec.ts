import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { ListRecordsComponent } from './list-records.component';
import { ListRecordsService } from '../../services/list-records/list-records.service';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { GeneralDqaService } from 'app/modules/data-quality/services/general-dqa.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ListRecordsComponent', () => {
  let component: ListRecordsComponent;
  let fixture: ComponentFixture<ListRecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListRecordsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // Defaults every test to Table 1 ('cause') unless a test overrides
        // this itself - mirrors records-routing.module.ts's `data: { mode }`.
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
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
    it('defaults to None, selected, with no search field options yet', () => {
      expect(component.searchBy).toBe('none');
      expect(component.searchByOptions).toEqual([
        { value: 'none', label: 'None' },
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
        { value: 'none', label: 'None' },
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

    it('switching to None clears the search value and reloads immediately - replaces the old Clear button', () => {
      fixture.detectChanges();
      component.searchBy = 'vaId';
      component.searchValue = 'uuid:f92c094d';
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();
      component.pageNumber = 3;

      component.onSearchByChange('none');

      expect(component.searchBy).toBe('none');
      expect(component.searchValue).toBe('');
      expect(component.pageNumber).toBe(1);
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onSearch', () => {
    it('resets to page 1 and reloads', () => {
      fixture.detectChanges();
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();
      component.pageNumber = 3;

      component.onSearch();

      expect(component.pageNumber).toBe(1);
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

    it('loads Gender options capitalized for display, with the raw value kept for matching', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getCcvaFilterOptions').mockReturnValue(of({
        data: { broad: [], major: [], specific: [], gender: ['female', 'male'] },
      }));
      fixture.detectChanges();

      component.onFilterByChange('gender');

      expect(component.filterValueChoices).toEqual([
        { value: '', label: 'All' },
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
      ]);
    });

    it('loads Age Group options as-is (already Title-case from the backend)', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getCcvaFilterOptions').mockReturnValue(of({
        data: { broad: [], major: [], specific: [], age_group: ['Neonate', 'Child', 'Adult', 'Unclassified'] },
      }));
      fixture.detectChanges();

      component.onFilterByChange('age_group');

      expect(component.filterValueChoices).toEqual([
        { value: '', label: 'All' },
        { value: 'Neonate', label: 'Neonate' },
        { value: 'Child', label: 'Child' },
        { value: 'Adult', label: 'Adult' },
        { value: 'Unclassified', label: 'Unclassified' },
      ]);
    });

    it('offers Specific Cause instead of Algorithm, plus Gender and Age Group, as Filter By choices', () => {
      fixture.detectChanges();
      expect(component.filterByChoices.map(c => c.value)).toEqual([
        'none', 'ccvaCauseBroad', 'ccvaCauseMajor', 'ccvaCauseSpecific', 'gender', 'age_group',
      ]);
    });
  });

  // Space-saving "Columns" menu - same gesture/placement as CCVA's own
  // Display Data table.
  describe('column visibility', () => {
    it('every toggleable column starts visible except Interviewer Name and Algorithm', () => {
      fixture.detectChanges();
      expect(component.isColumnVisible('ccvaCauseBroad')).toBe(true);
      expect(component.isColumnVisible('interviewerName')).toBe(false);
      expect(component.isColumnVisible('ccvaAlgorithm')).toBe(false);
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
      const initialVisible = 3 + component.columnsConfig.filter(c => c.visible).length;
      expect(component.totalColumns).toBe(initialVisible);

      component.toggleColumn('ccvaCauseBroad');
      component.toggleColumn('gender');

      expect(component.totalColumns).toBe(initialVisible - 2);
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

  // Group By - same 3 options as Filter By (aliased to the same array), on
  // top of the individual-record table when set to a Group/Count/
  // Percentage summary, same behavior as CCVA's own Display Data table.
  describe('Group By', () => {
    it('offers the exact same options as Filter By', () => {
      fixture.detectChanges();
      expect(component.groupByChoices).toBe(component.filterByChoices);
    });

    it('onGroupByChange loads the grouped summary instead of the individual list', () => {
      const service = TestBed.inject(ListRecordsService);
      const groupedSpy = jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({ data: [], total: 0 }));
      fixture.detectChanges();
      component.pageNumber = 3;

      component.onGroupByChange('ccvaCauseBroad');

      expect(component.groupBy).toBe('ccvaCauseBroad');
      expect(component.pageNumber).toBe(1);
      expect(groupedSpy).toHaveBeenCalledWith(
        'ccvaCauseBroad', undefined, undefined, [], 'none', '', undefined, undefined
      );
    });

    it('loadGroupedRecords populates groupedData/groupedTotal from the response', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({
        data: [{ group: 'Group I: Communicable', count: 7 }],
        total: 10,
      }));
      fixture.detectChanges();

      component.onGroupByChange('ccvaCauseBroad');

      expect(component.groupedData).toEqual([{ group: 'Group I: Communicable', count: 7 }]);
      expect(component.groupedTotal).toBe(10);
      expect(component.isLoadingGrouped).toBe(false);
    });

    it('passes the active Filter By/Value through to the grouped request', () => {
      const service = TestBed.inject(ListRecordsService);
      const groupedSpy = jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({ data: [], total: 0 }));
      fixture.detectChanges();
      component.filterBy = 'ccvaCauseMajor';
      component.filterValue = 'Malaria';

      component.onGroupByChange('ccvaCauseBroad');

      expect(groupedSpy).toHaveBeenCalledWith(
        'ccvaCauseBroad', undefined, undefined, [], 'none', '', 'ccvaCauseMajor', 'Malaria'
      );
    });

    it('search/filter actions reload the grouped summary instead of the individual list once grouped', () => {
      const service = TestBed.inject(ListRecordsService);
      const groupedSpy = jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({ data: [], total: 0 }));
      const individualSpy = jest.spyOn(service, 'getRecordsData');
      fixture.detectChanges();
      component.groupBy = 'ccvaCauseBroad';
      groupedSpy.mockClear();
      individualSpy.mockClear();

      component.onSearch();
      expect(groupedSpy).toHaveBeenCalledTimes(1);

      component.onFilterByChange('ccvaCauseMajor');
      expect(groupedSpy).toHaveBeenCalledTimes(2);

      expect(individualSpy).not.toHaveBeenCalled();
    });

    it('percentageFor computes a share of groupedTotal, and shows an em dash when total is 0', () => {
      fixture.detectChanges();
      component.groupedTotal = 0;
      expect(component.percentageFor({ group: 'x', count: 5 })).toBe('—');

      component.groupedTotal = 4;
      expect(component.percentageFor({ group: 'x', count: 1 })).toBe('25.0%');
    });

    it('labelFromChoices looks up the display label for a Group By value', () => {
      fixture.detectChanges();
      expect(component.labelFromChoices(component.groupByChoices, 'ccvaCauseMajor')).toBe('Major Category');
      expect(component.labelFromChoices(component.groupByChoices, 'not-a-real-value')).toBe('not-a-real-value');
    });
  });

  // Table/Pie/Bar/Map switcher - same control/behavior as CCVA's own
  // Display Data table.
  describe('viz switcher', () => {
    it('starts on Table', () => {
      fixture.detectChanges();
      expect(component.vizType).toBe('table');
    });

    it('onVizTypeChange to Pie/Bar is a no-op while Group By is None', () => {
      fixture.detectChanges();
      const loadSpy = jest.spyOn(component, 'loadRecords');
      loadSpy.mockClear();

      component.onVizTypeChange('pie');

      expect(component.vizType).toBe('table');
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('onVizTypeChange to Pie/Bar loads the grouped summary once a Group By is set', () => {
      const service = TestBed.inject(ListRecordsService);
      const groupedSpy = jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({ data: [], total: 0 }));
      fixture.detectChanges();
      component.groupBy = 'ccvaCauseBroad';
      groupedSpy.mockClear();

      component.onVizTypeChange('pie');

      expect(component.vizType).toBe('pie');
      expect(groupedSpy).toHaveBeenCalledTimes(1);
    });

    it('onVizTypeChange to Map loads map points instead of grouped/individual results', () => {
      const service = TestBed.inject(ListRecordsService);
      const mapSpy = jest.spyOn(service, 'getTableMapPoints').mockReturnValue(of({ data: [], total: 0 }));
      const individualSpy = jest.spyOn(service, 'getRecordsData');
      fixture.detectChanges();
      individualSpy.mockClear();

      component.onVizTypeChange('map');

      expect(component.vizType).toBe('map');
      expect(mapSpy).toHaveBeenCalledTimes(1);
      expect(individualSpy).not.toHaveBeenCalled();
    });

    it('switching Group By while on Map does not refetch map points (only their coloring changes)', () => {
      const service = TestBed.inject(ListRecordsService);
      const mapSpy = jest.spyOn(service, 'getTableMapPoints').mockReturnValue(of({ data: [], total: 0 }));
      fixture.detectChanges();
      component.vizType = 'map';
      mapSpy.mockClear();

      component.onGroupByChange('ccvaCauseBroad');

      expect(mapSpy).not.toHaveBeenCalled();
    });

    it('switching Group By back to None while on Pie/Bar falls back to Table', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({ data: [], total: 0 }));
      fixture.detectChanges();
      component.groupBy = 'ccvaCauseBroad';
      component.onVizTypeChange('pie');
      expect(component.vizType).toBe('pie');

      component.onGroupByChange('none');

      expect(component.vizType).toBe('table');
    });

    it('loadMapPoints populates mapPoints from the response', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getTableMapPoints').mockReturnValue(of({
        data: [{ vaId: 'uuid-1', lat: 1, lng: 2, region: 'dodoma', district: null, ccvaCauseBroad: null, ccvaCauseMajor: null, ccvaCauseSpecific: null, ccvaAlgorithm: null }],
        total: 1,
      }));
      fixture.detectChanges();

      component.onVizTypeChange('map');

      expect(component.mapPoints.length).toBe(1);
      expect(component.isLoadingMap).toBe(false);
    });

    it('buildGroupChart (via loadGroupedRecords) populates the chart data/labels', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({
        data: [{ group: 'Group I: Communicable', count: 7 }, { group: 'Group II: Non-Communicable', count: 3 }],
        total: 10,
      }));
      fixture.detectChanges();
      component.groupBy = 'ccvaCauseBroad';

      component.loadGroupedRecords();

      expect(component.groupChartLabels).toEqual(['Group I: Communicable', 'Group II: Non-Communicable']);
      expect(component.groupChartData[0].data).toEqual([7, 3]);
    });

    it('groupChartTitle/groupChartSubtitle reflect the active Group By and Filter By', () => {
      fixture.detectChanges();
      component.groupBy = 'ccvaCauseMajor';
      expect(component.groupChartTitle).toBe('Distribution by Major Category');
      expect(component.groupChartSubtitle).toBe('All records');

      component.filterBy = 'ccvaCauseBroad';
      component.filterValue = 'Group I: Communicable';
      expect(component.groupChartSubtitle).toBe('Broad Category: Group I: Communicable');
    });
  });

  // Group By summary table's own column-header sort - lost when the
  // summary table replaced the individual-record table, restored here as
  // a client-side sort (small result set), same reasoning as CCVA's own
  // grouped table.
  describe('sorting the Group By summary', () => {
    it('onGroupByChange defaults the sort to largest-groups-first', () => {
      const service = TestBed.inject(ListRecordsService);
      jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({ data: [], total: 0 }));
      fixture.detectChanges();

      component.onGroupByChange('ccvaCauseBroad');

      expect(component.sortColumn).toBe('count');
      expect(component.sortDirection).toBe('desc');
    });

    it('onSort on the grouped table sorts client-side without a network call', () => {
      const service = TestBed.inject(ListRecordsService);
      const groupedSpy = jest.spyOn(service, 'getGroupedRecords').mockReturnValue(of({ data: [], total: 0 }));
      fixture.detectChanges();
      component.groupBy = 'ccvaCauseBroad';
      component.groupedData = [
        { group: 'Group I: Communicable', count: 9 },
        { group: 'Group II: Non-Communicable', count: 4 },
      ];
      component.sortColumn = 'count';
      component.sortDirection = 'desc';
      groupedSpy.mockClear();

      component.onSort('count'); // toggles desc -> asc

      expect(component.groupedData).toEqual([
        { group: 'Group II: Non-Communicable', count: 4 },
        { group: 'Group I: Communicable', count: 9 },
      ]);
      expect(groupedSpy).not.toHaveBeenCalled();
    });

    it('onSort by the group label column sorts alphabetically', () => {
      fixture.detectChanges();
      component.groupBy = 'ccvaCauseBroad';
      component.groupedData = [
        { group: 'Group II: Non-Communicable', count: 4 },
        { group: 'Group I: Communicable', count: 9 },
      ];
      component.sortColumn = null;

      component.onSort('group');

      expect(component.groupedData).toEqual([
        { group: 'Group I: Communicable', count: 9 },
        { group: 'Group II: Non-Communicable', count: 4 },
      ]);
    });

    it('onSort still hits the server for the individual table (groupBy none)', () => {
      const service = TestBed.inject(ListRecordsService);
      const individualSpy = jest.spyOn(service, 'getRecordsData');
      fixture.detectChanges();
      individualSpy.mockClear();

      component.onSort('ccvaCauseBroad');

      expect(individualSpy).toHaveBeenCalledTimes(1);
    });
  });

  // Table 2 - set via records-routing.module.ts's `data: { mode: 'dqa' }`
  // on the /table-2 route, read from ActivatedRoute.snapshot.data in
  // ngOnInit(). A separate TestBed module (rather than reusing the outer
  // one) since `mode` is read once at construction time, before any test
  // body runs.
  describe('Table 2 (DQA mode)', () => {
    let dqaFixture: ComponentFixture<ListRecordsComponent>;
    let dqaComponent: ListRecordsComponent;

    beforeEach(async () => {
      await TestBed.resetTestingModule()
        .configureTestingModule({
          declarations: [ListRecordsComponent],
          providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            { provide: ActivatedRoute, useValue: { snapshot: { data: { mode: 'dqa' } } } },
          ],
        })
        .compileComponents();

      dqaFixture = TestBed.createComponent(ListRecordsComponent);
      dqaComponent = dqaFixture.componentInstance;
    });

    it('offers RRS/ICS/ICI/AID, plus Gender and Age Group, as Filter By/Group By choices', () => {
      dqaFixture.detectChanges();
      expect(dqaComponent.filterByChoices.map(c => c.value)).toEqual([
        'none', 'dqaRrs', 'dqaIcs', 'dqaIci', 'dqaAid', 'gender', 'age_group',
      ]);
      expect(dqaComponent.groupByChoices).toBe(dqaComponent.filterByChoices);
    });

    it('shows the 4 DQA columns visible by default, with no Algorithm/CCVA cause columns', () => {
      dqaFixture.detectChanges();
      expect(dqaComponent.isColumnVisible('dqaRrs')).toBe(true);
      expect(dqaComponent.isColumnVisible('dqaIcs')).toBe(true);
      expect(dqaComponent.isColumnVisible('dqaIci')).toBe(true);
      expect(dqaComponent.isColumnVisible('dqaAid')).toBe(true);
      expect(dqaComponent.columnsConfig.some(c => c.key === 'ccvaCauseBroad')).toBe(false);
      expect(dqaComponent.columnsConfig.some(c => c.key === 'ccvaAlgorithm')).toBe(false);
    });

    it('shows the "analytics not run" banner once the snapshot comes back incomplete', () => {
      const dqaService = TestBed.inject(GeneralDqaService);
      jest.spyOn(dqaService, 'getAnalyticsSnapshot').mockReturnValue(
        of({ data: { status: 'running' } as any, message: '' })
      );

      dqaFixture.detectChanges();

      expect(dqaComponent.showDqaNotRunBanner).toBe(true);
    });

    it('hides the banner once the snapshot comes back completed', () => {
      const dqaService = TestBed.inject(GeneralDqaService);
      jest.spyOn(dqaService, 'getAnalyticsSnapshot').mockReturnValue(
        of({ data: { status: 'completed' } as any, message: '' })
      );

      dqaFixture.detectChanges();

      expect(dqaComponent.showDqaNotRunBanner).toBe(false);
    });

    it('does not show the banner on Table 1 (cause mode)', () => {
      fixture.detectChanges();
      expect(component.showDqaNotRunBanner).toBe(false);
    });
  });
});
