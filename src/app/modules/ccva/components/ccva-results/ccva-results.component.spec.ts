import { of, throwError } from 'rxjs';

import { CcvaResultsComponent } from './ccva-results.component';

// Constructed directly, without TestBed/template compilation - same style
// used for ListCcvaComponent's unit tests: plain component-class logic
// driven through mocked collaborators.
describe('CcvaResultsComponent (unit)', () => {
  function makeComponent(taskId: string | null = 'task-123') {
    const route = { snapshot: { paramMap: { get: () => taskId } } } as any;
    const router = { navigate: jest.fn() } as any;
    const ccvaService = {
      get_ccva_individual_results: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      get_ccva_filter_options: jest.fn().mockReturnValue(of({
        data: { gender: ['female', 'male'], age_group: ['adult', 'child'], broad: ['Group II: Non-Communicable'], major: ['Diseases of the circulatory system'] },
      })),
    } as any;
    const dialog = { open: jest.fn() } as any;
    const snackBar = { open: jest.fn() } as any;
    const adminUnitLabelsService = {
      load: jest.fn().mockReturnValue(of(new Map())),
      friendlyLabel: jest.fn((v: string) => `Friendly(${v})`),
    } as any;
    const settingConfigService = {
      getSettingsConfig: jest.fn().mockReturnValue(of({
        system_configs: { admin_level1: 'Region', admin_level2: 'District', admin_level3: 'Ward' },
      })),
    } as any;
    const exportToExcel = jest.fn();
    (ccvaService as any).exportToExcel = exportToExcel;

    const component = new CcvaResultsComponent(
      route, router, ccvaService, dialog, snackBar, adminUnitLabelsService, settingConfigService
    );
    // The constructor alone doesn't read the route (that's ngOnInit's job -
    // see its own dedicated test below) - set it directly so tests focused
    // on search/sort/pagination don't need to call ngOnInit first.
    component.taskId = taskId ?? '';
    return { component, route, router, ccvaService, dialog, snackBar, adminUnitLabelsService, settingConfigService, exportToExcel };
  }

  describe('ngOnInit / loadResults', () => {
    it('reads task_id from the route and loads results', () => {
      const { component, ccvaService } = makeComponent('t1');
      component.ngOnInit();

      expect(component.taskId).toBe('t1');
      expect(ccvaService.get_ccva_individual_results).toHaveBeenCalledWith(
        't1', 1, 10, undefined, undefined, undefined, undefined, 'asc'
      );
    });

    it('loads the filter options for the Filter Value dropdown', () => {
      const { component, ccvaService } = makeComponent('t1');
      component.ngOnInit();

      expect(ccvaService.get_ccva_filter_options).toHaveBeenCalledWith('t1');
      expect(component.filterOptions).toEqual({
        gender: ['female', 'male'],
        age_group: ['adult', 'child'],
        broad: ['Group II: Non-Communicable'],
        major: ['Diseases of the circulatory system'],
      });
    });

    it('loads the configured admin-level labels', () => {
      const { component } = makeComponent();
      component.ngOnInit();

      expect(component.regionLabel).toBe('Region');
      expect(component.districtLabel).toBe('District');
      expect(component.wardLabel).toBe('Ward');
    });

    it('shows an error and stops loading when the task id is missing', () => {
      const { component } = makeComponent();
      component.taskId = '';

      component.loadResults();

      expect(component.errorMessage).toContain('could not be identified');
      expect(component.isLoading).toBe(false);
    });

    it('populates data/totalRecords on success', () => {
      const { component, ccvaService } = makeComponent();
      ccvaService.get_ccva_individual_results.mockReturnValue(of({ data: [{ va_id: 'x' }], total: 1 }));

      component.loadResults();

      expect(component.data).toEqual([{ va_id: 'x' }]);
      expect(component.totalRecords).toBe(1);
      expect(component.isLoading).toBe(false);
    });

    it('shows an error message on failure', () => {
      const { component, ccvaService } = makeComponent();
      ccvaService.get_ccva_individual_results.mockReturnValue(throwError(() => new Error('boom')));

      component.loadResults();

      expect(component.errorMessage).toContain('Failed to load');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('search', () => {
    it('onSearch resets to page 1 and passes the trimmed VA ID search term', () => {
      const { component, ccvaService } = makeComponent();
      component.pageNumber = 3;
      component.searchVaId = '  abc  ';

      component.onSearch();

      expect(component.pageNumber).toBe(1);
      expect(ccvaService.get_ccva_individual_results).toHaveBeenCalledWith(
        'task-123', 1, 10, 'abc', undefined, undefined, undefined, 'asc'
      );
    });

    it('onClearSearch clears the VA ID, resets Filter By to None, resets to page 1, and reloads', () => {
      const { component, ccvaService } = makeComponent();
      component.searchVaId = 'abc';
      component.filterBy = 'gender';
      component.filterValue = 'female';
      component.pageNumber = 2;

      component.onClearSearch();

      expect(component.searchVaId).toBe('');
      expect(component.filterBy).toBe('none');
      expect(component.filterValue).toBe('');
      expect(component.pageNumber).toBe(1);
      expect(ccvaService.get_ccva_individual_results).toHaveBeenLastCalledWith(
        'task-123', 1, 10, undefined, undefined, undefined, undefined, 'asc'
      );
    });
  });

  describe('Filter By / Filter Value', () => {
    it('currentFilterValueOptions reflects the selected Filter By field', () => {
      const { component } = makeComponent();
      component.filterOptions = {
        gender: ['female', 'male'], age_group: ['adult', 'child'],
        broad: ['Group III: Injuries'], major: ['Neoplasms'],
      };

      expect(component.currentFilterValueOptions).toEqual([]); // filterBy defaults to 'none'
      component.filterBy = 'gender';
      expect(component.currentFilterValueOptions).toEqual(['female', 'male']);
      component.filterBy = 'broad';
      expect(component.currentFilterValueOptions).toEqual(['Group III: Injuries']);
    });

    it('filterValueChoices leads with an "All" option ahead of the distinct values', () => {
      const { component } = makeComponent();
      component.filterOptions = {
        gender: ['female', 'male'], age_group: [], broad: [], major: [],
      };

      // filterValueChoices is a plain field (not a getter) recomputed by
      // onFilterByChange - see the comment on its declaration for why: a
      // getter returning a fresh array on every read trips Angular's
      // NG0103 infinite-change-detection guard on the bound child dropdown.
      component.onFilterByChange('gender');

      expect(component.filterValueChoices).toEqual([
        { value: '', label: 'All' },
        { value: 'female', label: 'female' },
        { value: 'male', label: 'male' },
      ]);
    });

    it('onClearSearch resets filterValueChoices back to just "All"', () => {
      const { component } = makeComponent();
      component.filterOptions = { gender: ['female', 'male'], age_group: [], broad: [], major: [] };
      component.onFilterByChange('gender');

      component.onClearSearch();

      expect(component.filterValueChoices).toEqual([{ value: '', label: 'All' }]);
    });

    it('onFilterByChange resets Filter Value, reloads at page 1, and omits the filter until a value is chosen', () => {
      const { component, ccvaService } = makeComponent();
      component.pageNumber = 3;
      component.filterValue = 'female';

      component.onFilterByChange('age_group');

      expect(component.filterBy).toBe('age_group');
      expect(component.filterValue).toBe('');
      expect(component.pageNumber).toBe(1);
      // filterBy is still passed through ('age_group'), but with no
      // filterValue the service itself won't send filter params to the API.
      expect(ccvaService.get_ccva_individual_results).toHaveBeenLastCalledWith(
        'task-123', 1, 10, undefined, 'age_group', undefined, undefined, 'asc'
      );
    });

    it('onFilterByChange is a no-op when reselecting the same field', () => {
      const { component, ccvaService } = makeComponent();
      component.filterBy = 'gender';
      component.filterValue = 'female';
      ccvaService.get_ccva_individual_results.mockClear();

      component.onFilterByChange('gender');

      expect(component.filterValue).toBe('female');
      expect(ccvaService.get_ccva_individual_results).not.toHaveBeenCalled();
    });

    it('onFilterValueChange applies both Filter By and Filter Value, resetting to page 1', () => {
      const { component, ccvaService } = makeComponent();
      component.pageNumber = 4;
      component.filterBy = 'broad';

      component.onFilterValueChange('Group III: Injuries');

      expect(component.filterValue).toBe('Group III: Injuries');
      expect(component.pageNumber).toBe(1);
      expect(ccvaService.get_ccva_individual_results).toHaveBeenLastCalledWith(
        'task-123', 1, 10, undefined, 'broad', 'Group III: Injuries', undefined, 'asc'
      );
    });

    it('a Filter By of none is never sent, even if a stale Filter Value is set', () => {
      const { component, ccvaService } = makeComponent();
      component.filterBy = 'none';
      component.filterValue = 'leftover';

      component.loadResults();

      expect(ccvaService.get_ccva_individual_results).toHaveBeenLastCalledWith(
        'task-123', 1, 10, undefined, undefined, undefined, undefined, 'asc'
      );
    });
  });

  describe('onSort / sortIcon', () => {
    it('sorts ascending on first click of a column, resetting to page 1', () => {
      const { component, ccvaService } = makeComponent();
      component.pageNumber = 2;

      component.onSort('cause1');

      expect(component.sortColumn).toBe('cause1');
      expect(component.sortDirection).toBe('asc');
      expect(component.pageNumber).toBe(1);
      expect(ccvaService.get_ccva_individual_results).toHaveBeenLastCalledWith(
        'task-123', 1, 10, undefined, undefined, undefined, 'cause1', 'asc'
      );
    });

    it('toggles direction on a second click of the same column', () => {
      const { component } = makeComponent();
      component.onSort('cause1');
      component.onSort('cause1');
      expect(component.sortDirection).toBe('desc');
    });

    it('switching to a different column resets direction to ascending', () => {
      const { component } = makeComponent();
      component.onSort('cause1');
      component.onSort('cause1'); // now desc
      component.onSort('cause2');
      expect(component.sortColumn).toBe('cause2');
      expect(component.sortDirection).toBe('asc');
    });

    it('sortIcon reflects the current sort state', () => {
      const { component } = makeComponent();
      expect(component.sortIcon('cause1')).toContain('arrows-down-up');
      component.onSort('cause1');
      expect(component.sortIcon('cause1')).toContain('arrow-up');
      component.onSort('cause1');
      expect(component.sortIcon('cause1')).toContain('arrow-down');
    });
  });

  describe('locationLabel / formatProbability', () => {
    it('returns an em dash for a missing location value', () => {
      const { component } = makeComponent();
      expect(component.locationLabel(null)).toBe('—');
      expect(component.locationLabel('')).toBe('—');
    });

    it('delegates to AdminUnitLabelsService for a real value', () => {
      const { component, adminUnitLabelsService } = makeComponent();
      expect(component.locationLabel('dodoma')).toBe('Friendly(dodoma)');
      expect(adminUnitLabelsService.friendlyLabel).toHaveBeenCalledWith('dodoma');
    });

    it('formats a probability as a percentage, and an em dash when absent', () => {
      const { component } = makeComponent();
      expect(component.formatProbability(83)).toBe('83%');
      expect(component.formatProbability(null)).toBe('—');
      expect(component.formatProbability(undefined)).toBe('—');
    });
  });

  describe('pagination', () => {
    it('computes rangeStart/rangeEnd/hasPrevious/hasNext', () => {
      const { component } = makeComponent();
      component.totalRecords = 25;
      component.limit = 10;
      component.pageNumber = 2;

      expect(component.rangeStart).toBe(11);
      expect(component.rangeEnd).toBe(20);
      expect(component.hasPrevious).toBe(true);
      expect(component.hasNext).toBe(true);
    });

    it('goToPreviousPage/goToNextPage respect the has-more guards', () => {
      const { component, ccvaService } = makeComponent();
      component.totalRecords = 15;
      component.limit = 10;
      component.pageNumber = 1;

      component.goToPreviousPage(); // no previous page - no-op
      expect(component.pageNumber).toBe(1);

      component.goToNextPage();
      expect(component.pageNumber).toBe(2);
      expect(ccvaService.get_ccva_individual_results).toHaveBeenCalled();

      component.goToNextPage(); // no next page - no-op
      expect(component.pageNumber).toBe(2);
    });
  });

  describe('onView', () => {
    it('opens ViewVaComponent with the row VA id, matching the VA Records dialog config', () => {
      const { component, dialog } = makeComponent();
      component.onView({ va_id: 'uuid-1' } as any);

      expect(dialog.open).toHaveBeenCalledTimes(1);
      const [, config] = dialog.open.mock.calls[0];
      expect(config.data).toEqual({ va: 'uuid-1' });
      expect(config.width).toBe('95vw');
      expect(config.height).toBe('90vh');
      expect(config.panelClass).toBe('cdk-overlay-pane');
    });
  });

  describe('onBack', () => {
    it('navigates to the CCVA list', () => {
      const { component, router } = makeComponent();
      component.onBack();
      expect(router.navigate).toHaveBeenCalledWith(['/ccva']);
    });
  });

  describe('Cause 2 column toggle', () => {
    it('is hidden by default', () => {
      const { component } = makeComponent();
      expect(component.showCause2).toBe(false);
      expect(component.totalColumns).toBe(11);
    });

    it('toggleCause2Column shows it, and adds 2 to totalColumns', () => {
      const { component } = makeComponent();
      component.toggleCause2Column();
      expect(component.showCause2).toBe(true);
      expect(component.totalColumns).toBe(13);

      component.toggleCause2Column();
      expect(component.showCause2).toBe(false);
      expect(component.totalColumns).toBe(11);
    });
  });

  describe('Columns menu', () => {
    it('toggleColumnsMenu opens and closes it', () => {
      const { component } = makeComponent();
      expect(component.columnsMenuOpen).toBe(false);
      component.toggleColumnsMenu();
      expect(component.columnsMenuOpen).toBe(true);
      component.toggleColumnsMenu();
      expect(component.columnsMenuOpen).toBe(false);
    });

    it('closes on a click outside the menu wrapper', () => {
      const { component } = makeComponent();
      component.columnsMenuOpen = true;
      const outsideEl = document.createElement('div');
      const event = { composedPath: () => [outsideEl] } as unknown as MouseEvent;

      component.onDocumentClickForColumnsMenu(event);

      expect(component.columnsMenuOpen).toBe(false);
    });

    it('stays open on a click inside the menu wrapper', () => {
      const { component } = makeComponent();
      component.columnsMenuOpen = true;
      const insideEl = document.createElement('div');
      insideEl.classList.add('columns-menu-wrapper');
      const event = { composedPath: () => [insideEl] } as unknown as MouseEvent;

      component.onDocumentClickForColumnsMenu(event);

      expect(component.columnsMenuOpen).toBe(true);
    });

    it('is a no-op when the menu is already closed', () => {
      const { component } = makeComponent();
      component.columnsMenuOpen = false;
      const event = { composedPath: () => [] } as unknown as MouseEvent;

      component.onDocumentClickForColumnsMenu(event);

      expect(component.columnsMenuOpen).toBe(false);
    });
  });

  describe('onDownload', () => {
    it('fetches every row matching the current search (not just the current page) and exports it', async () => {
      const { component, ccvaService, exportToExcel } = makeComponent();
      component.regionLabel = 'Region';
      component.districtLabel = 'District';
      component.wardLabel = 'Ward';
      component.searchVaId = 'abc';
      component.filterBy = 'broad';
      component.filterValue = 'Group II: Non-Communicable';
      component.sortColumn = 'cause1';
      component.sortDirection = 'desc';
      ccvaService.get_ccva_individual_results.mockReturnValue(of({
        data: [{
          va_id: 'uuid-1',
          locationLevel1: 'dodoma',
          locationLevel2: 'kongwa_dc',
          locationLevel3: null,
          gender: 'male',
          age_group: 'adult',
          cause1: 'Stroke',
          cause1_probability: 83,
          cause1_major: 'Diseases of the circulatory system',
          cause1_broad: 'Group II: Non-Communicable',
          cause2: null,
          cause2_probability: null,
        }],
        total: 1,
      }));

      await component.onDownload();

      expect(ccvaService.get_ccva_individual_results).toHaveBeenCalledWith(
        'task-123', 1, 200_000, 'abc', 'broad', 'Group II: Non-Communicable', 'cause1', 'desc'
      );
      expect(exportToExcel).toHaveBeenCalledTimes(1);
      const [rows, fileName] = exportToExcel.mock.calls[0];
      expect(fileName).toBe('CCVA_Results_task-123');
      expect(rows[0]).toEqual({
        'VA ID': 'uuid-1',
        Region: 'Friendly(dodoma)',
        District: 'Friendly(kongwa_dc)',
        Ward: '—',
        Gender: 'male',
        'Age Group': 'adult',
        'Cause 1': 'Stroke',
        'Cause 1 Probability': '83%',
        'Broad Category': 'Group II: Non-Communicable',
        'Major Category': 'Diseases of the circulatory system',
        'Cause 2': '—',
        'Cause 2 Probability': '—',
      });
      expect(component.isExporting).toBe(false);
    });

    it('does nothing when the task id is missing', async () => {
      const { component, ccvaService } = makeComponent();
      component.taskId = '';

      await component.onDownload();

      expect(ccvaService.get_ccva_individual_results).not.toHaveBeenCalled();
    });

    it('ignores a call while an export is already in progress', async () => {
      const { component, ccvaService } = makeComponent();
      component.isExporting = true;

      await component.onDownload();

      expect(ccvaService.get_ccva_individual_results).not.toHaveBeenCalled();
    });

    it('shows a snackbar and resets isExporting when the fetch fails', async () => {
      const { component, ccvaService, snackBar } = makeComponent();
      ccvaService.get_ccva_individual_results.mockReturnValue(throwError(() => new Error('boom')));

      await component.onDownload();

      expect(snackBar.open).toHaveBeenCalled();
      expect(component.isExporting).toBe(false);
    });
  });
});
