import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ConfigurationComponent } from './configuration.component';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';

// Constructed directly, without TestBed/template compilation - this
// component's constructor deps are plain injectables (FormBuilder is used
// for real; everything else is a mock), and the methods under test are
// plain component-class logic.
function makeComponent(overrides: { cachedQuestions?: any } = {}) {
  const settingConfigService = {
    getSettingsConfig: jest.fn().mockReturnValue(of(null)),
    saveConnectionData: jest.fn().mockReturnValue(of({})),
    clearCache: jest.fn(),
    getExpectedDeaths: jest.fn().mockReturnValue(of({ data: { configured: false, max_level: 0, periods: [], tree: [] } })),
    updateExpectedDeaths: jest.fn().mockReturnValue(of({ data: { configured: true, max_level: 1, periods: [], tree: [] } })),
  } as any;
  const indexedDBService = {} as any;
  const genericIndexedDbService = {
    getData: jest.fn().mockResolvedValue(overrides.cachedQuestions ?? []),
  } as any;
  const authService = {
    hasPrivilege: jest.fn().mockReturnValue(of(true)),
  } as any;
  const vaRecordsService = {} as any;
  const dataSyncService = {} as any;
  const snackBar = { open: jest.fn() } as any;

  const component = new ConfigurationComponent(
    settingConfigService,
    indexedDBService,
    genericIndexedDbService,
    authService,
    vaRecordsService,
    dataSyncService,
    new FormBuilder(),
    snackBar
  );

  return { component, settingConfigService, genericIndexedDbService, snackBar };
}

describe('ConfigurationComponent', () => {
  it('should create', () => {
    const { component } = makeComponent();
    expect(component).toBeTruthy();
  });

  describe('vaFieldOptions (Field Mapping / VA Summary search)', () => {
    // Regression: this used to be populated once, in the constructor - a
    // leftover from when Field Mapping was its own dialog (fresh instance,
    // fresh fetch, every open). As an inline page component, the array was
    // never refreshed again after a later "Sync Questions", so the search
    // kept showing whatever was cached at first page load.
    it('is populated from IndexedDB when the component is constructed', async () => {
      const { component, genericIndexedDbService } = makeComponent({
        cachedQuestions: [
          { key: 'isadult', value: { label: 'Is Adult' } },
          { key: 'ischild', value: { label: 'Is Child' } },
        ],
      });

      expect(genericIndexedDbService.getData).toHaveBeenCalledWith(OBJECTSTORE_VA_QUESTIONS);
      // getData() resolves asynchronously - flush the microtask queue.
      await Promise.resolve();
      await Promise.resolve();

      expect(component.vaFieldOptions).toEqual([
        { label: 'Is Adult', value: 'isadult' },
        { label: 'Is Child', value: 'ischild' },
      ]);
    });

    it('falls back to an empty list when nothing is cached', async () => {
      const { component } = makeComponent({ cachedQuestions: [] });
      await Promise.resolve();
      await Promise.resolve();

      expect(component.vaFieldOptions).toEqual([]);
    });
  });

  describe('saveSystemConfig', () => {
    function validSystemConfig() {
      return {
        app_name: 'VMan3',
        page_title: 'Title',
        page_subtitle: 'Subtitle',
        admin_level1: 'Region',
        admin_level2: 'District',
        admin_level3: 'Ward',
      };
    }

    it('saves and refreshes when all required fields are filled', () => {
      const { component, settingConfigService, snackBar } = makeComponent();
      component.systemConfigForm.patchValue(validSystemConfig());

      component.saveSystemConfig();

      expect(settingConfigService.saveConnectionData).toHaveBeenCalledWith(
        'system_configs',
        expect.objectContaining(validSystemConfig())
      );
      expect(snackBar.open).toHaveBeenCalledWith(
        'System configuration saved successfully',
        'Close',
        expect.anything()
      );
    });

    it('does not require admin_level4 or map_center', () => {
      const { component, settingConfigService } = makeComponent();
      component.systemConfigForm.patchValue({ ...validSystemConfig(), admin_level4: '', map_center: '' });

      component.saveSystemConfig();

      expect(settingConfigService.saveConnectionData).toHaveBeenCalled();
    });

    it('lists exactly the missing required fields by name instead of saving', () => {
      const { component, settingConfigService, snackBar } = makeComponent();
      component.systemConfigForm.patchValue({
        ...validSystemConfig(),
        page_subtitle: '',
        admin_level3: '',
      });

      component.saveSystemConfig();

      expect(settingConfigService.saveConnectionData).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please fill in the following required fields: Page Subtitle, Admin Level 3',
        'Close',
        expect.anything()
      );
    });

    it('surfaces the backend error message when the save fails', () => {
      const { component, settingConfigService, snackBar } = makeComponent();
      settingConfigService.saveConnectionData.mockReturnValue(
        throwError(() => ({ error: { detail: 'Duplicate app name' } }))
      );
      component.systemConfigForm.patchValue(validSystemConfig());

      component.saveSystemConfig();

      expect(component.isSavingSystemConfig).toBe(false);
      expect(snackBar.open).toHaveBeenCalledWith('Duplicate app name', 'Close', expect.anything());
    });
  });

  describe('saveFieldMapping', () => {
    function validFieldMapping() {
      return {
        instance_id: 'instanceID',
        va_id: 'meta-instanceID',
        location_level1: 'region',
        interviewer_name: 'id10010',
        is_adult: 'isadult',
        is_child: 'ischild',
        is_neonate: 'isneonatal',
      };
    }

    it('saves when all required mappings are set', () => {
      const { component, settingConfigService } = makeComponent();
      component.fieldMappingForm.patchValue(validFieldMapping());

      component.saveFieldMapping();

      expect(settingConfigService.saveConnectionData).toHaveBeenCalledWith(
        'field_mapping',
        expect.objectContaining(validFieldMapping())
      );
    });

    it('does not require location_level2-4 or the date fields', () => {
      const { component, settingConfigService } = makeComponent();
      component.fieldMappingForm.patchValue(validFieldMapping());
      // location_level2/3/4, dates, etc. left at their default blank value.

      component.saveFieldMapping();

      expect(settingConfigService.saveConnectionData).toHaveBeenCalled();
    });

    it('lists exactly the missing required mappings instead of saving', () => {
      const { component, settingConfigService, snackBar } = makeComponent();
      component.fieldMappingForm.patchValue({
        ...validFieldMapping(),
        is_adult: '',
        is_neonate: '',
      });

      component.saveFieldMapping();

      expect(settingConfigService.saveConnectionData).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please map the following required fields: Is Adult, Is Neonate',
        'Close',
        expect.anything()
      );
    });
  });

  describe('saveVaSummaryFields', () => {
    // One button now saves both the selected fields and the Cause of Death
    // checkboxes - there used to be two separate save buttons/methods for
    // these, which the user found confusing (two steps for one section).
    it('saves the selected fields and the CoD checkboxes together, in a single click', () => {
      const { component, settingConfigService, snackBar } = makeComponent();
      component.vaSummaryData = ['age_adult', 'sex'];
      component.vaSummaryCodOptions = { include_ccva_default: true, include_pcva: false };

      component.saveVaSummaryFields();

      expect(settingConfigService.saveConnectionData).toHaveBeenCalledWith('va_summary', ['age_adult', 'sex']);
      expect(settingConfigService.saveConnectionData).toHaveBeenCalledWith(
        'va_summary_cod_options',
        { include_ccva_default: true, include_pcva: false }
      );
      expect(component.isSavingVaSummary).toBe(false);
      expect(snackBar.open).toHaveBeenCalledWith(
        'VA Summary configuration saved successfully',
        'Close',
        expect.anything()
      );
    });

    it('surfaces the backend error message when either save fails', () => {
      const { component, settingConfigService, snackBar } = makeComponent();
      settingConfigService.saveConnectionData.mockReturnValue(
        throwError(() => ({ error: { detail: 'Failed to save' } }))
      );

      component.saveVaSummaryFields();

      expect(component.isSavingVaSummary).toBe(false);
      expect(snackBar.open).toHaveBeenCalledWith('Failed to save', 'Close', expect.anything());
    });
  });

  describe('Expected Number of Deaths', () => {
    function node(overrides: Partial<any> = {}) {
      return {
        key: 'k1', level: 1, value: 'v1', label: 'Region 1',
        expected_deaths: { '2023': 100, '2024': 110 }, is_leaf: false, children: [],
        ...overrides,
      };
    }

    describe('loadExpectedDeaths', () => {
      it('stores the tree, configured flag, and periods, defaulting every period to visible', () => {
        const { component, settingConfigService } = makeComponent();
        const tree = [node()];
        settingConfigService.getExpectedDeaths.mockReturnValue(
          of({ data: { configured: true, max_level: 2, periods: ['2023', '2024'], tree } })
        );

        component.loadExpectedDeaths();

        expect(component.expectedDeathsConfigured).toBe(true);
        expect(component.expectedDeathsMaxLevel).toBe(2);
        expect(component.expectedDeathsTree).toEqual(tree);
        expect(component.expectedDeathsPeriods).toEqual(['2023', '2024']);
        expect(component.visiblePeriods).toEqual(['2023', '2024']);
        expect(component.expectedDeathsLoading).toBe(false);
      });

      it('keeps the current visibility selection across a reload, dropping any period that is gone', () => {
        const { component, settingConfigService } = makeComponent();
        settingConfigService.getExpectedDeaths.mockReturnValue(
          of({ data: { configured: true, max_level: 1, periods: ['2023', '2024'], tree: [] } })
        );
        component.loadExpectedDeaths();
        // User hides 2024, leaving only 2023 visible.
        component.togglePeriodVisibility('2024');

        settingConfigService.getExpectedDeaths.mockReturnValue(
          of({ data: { configured: true, max_level: 1, periods: ['2023', '2025'], tree: [] } })
        );
        component.loadExpectedDeaths();

        // 2024 is gone from the new response and drops out; 2023 survives.
        expect(component.visiblePeriods).toEqual(['2023']);
      });

      it('surfaces a load error', () => {
        const { component, settingConfigService } = makeComponent();
        settingConfigService.getExpectedDeaths.mockReturnValue(throwError(() => new Error('down')));

        component.loadExpectedDeaths();

        expect(component.expectedDeathsError).toBe('Could not load expected deaths.');
        expect(component.expectedDeathsLoading).toBe(false);
      });
    });

    describe('deathsForPeriod', () => {
      it('reads the value for the given period', () => {
        const { component } = makeComponent();
        expect(component.deathsForPeriod(node(), '2023')).toBe(100);
      });

      it('returns null when the node has nothing for that period', () => {
        const { component } = makeComponent();
        expect(component.deathsForPeriod(node(), '2099')).toBeNull();
      });
    });

    describe('togglePeriodVisibility / isPeriodVisible', () => {
      it('hides a period that was visible', () => {
        const { component } = makeComponent();
        component.visiblePeriods = ['2023', '2024', '2025'];

        component.togglePeriodVisibility('2024');

        expect(component.visiblePeriods).toEqual(['2023', '2025']);
        expect(component.isPeriodVisible('2024')).toBe(false);
      });

      it('shows a period that was hidden', () => {
        const { component } = makeComponent();
        component.visiblePeriods = ['2023'];

        component.togglePeriodVisibility('2024');

        expect(component.visiblePeriods).toEqual(['2023', '2024']);
        expect(component.isPeriodVisible('2024')).toBe(true);
      });
    });

    describe('years dropdown open/close', () => {
      it('toggleYearsDropdown flips the open state', () => {
        const { component } = makeComponent();
        expect(component.yearsDropdownOpen).toBe(false);

        component.toggleYearsDropdown();
        expect(component.yearsDropdownOpen).toBe(true);

        component.toggleYearsDropdown();
        expect(component.yearsDropdownOpen).toBe(false);
      });

      // Real dispatched events, not plain { target } stand-ins: the handler
      // reads event.composedPath(), which is only populated while an event
      // is actually being dispatched through the DOM.
      it('closes on a click outside the dropdown wrapper', () => {
        const { component } = makeComponent();
        component.yearsDropdownOpen = true;
        const outsideEl = document.createElement('div');
        document.body.appendChild(outsideEl);
        outsideEl.addEventListener('click', (e) => component.onDocumentClickForYearsDropdown(e as MouseEvent));

        outsideEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(component.yearsDropdownOpen).toBe(false);
        outsideEl.remove();
      });

      it('stays open on a click inside the dropdown wrapper', () => {
        const { component } = makeComponent();
        component.yearsDropdownOpen = true;
        const wrapper = document.createElement('div');
        wrapper.className = 'years-dropdown-wrapper';
        const checkbox = document.createElement('input');
        wrapper.appendChild(checkbox);
        document.body.appendChild(wrapper);
        checkbox.addEventListener('click', (e) => component.onDocumentClickForYearsDropdown(e as MouseEvent));

        checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(component.yearsDropdownOpen).toBe(true);
        wrapper.remove();
      });
    });

    describe('levelLabel', () => {
      it('reuses the configurable admin_levelN label from System Configuration', () => {
        const { component } = makeComponent();
        component.systemConfigData = { admin_level1: 'Region', admin_level2: 'District' } as any;

        expect(component.levelLabel(1)).toBe('Region');
        expect(component.levelLabel(2)).toBe('District');
      });

      it('falls back to a generic "Level N" when no label is configured that deep', () => {
        const { component } = makeComponent();
        component.systemConfigData = { admin_level1: 'Region' } as any;

        expect(component.levelLabel(3)).toBe('Level 3');
      });
    });

    describe('filteredExpectedDeathsTree', () => {
      // A plain field recomputed by onExpectedDeathsSearchChange() / after a
      // reload - not a live getter. A getter re-evaluated on every
      // change-detection pass, feeding a recursive *ngTemplateOutlet, was
      // unstable enough in practice to trip Angular's NG0103 "infinite
      // change detection" guard.
      it('returns the tree unfiltered when there is no search term', () => {
        const { component, settingConfigService } = makeComponent();
        const tree = [node()];
        settingConfigService.getExpectedDeaths.mockReturnValue(
          of({ data: { configured: true, max_level: 1, tree } })
        );

        component.loadExpectedDeaths();

        expect(component.filteredExpectedDeathsTree).toEqual(tree);
      });

      it('keeps a branch when a descendant matches, even if the branch itself does not', () => {
        const { component } = makeComponent();
        component.expectedDeathsTree = [
          node({
            key: 'region', label: 'Dodoma',
            children: [node({ key: 'district', label: 'Kongwa District Council', children: [] })],
          }),
        ];
        component.expectedDeathsSearch = 'kongwa';
        component.onExpectedDeathsSearchChange();

        const result = component.filteredExpectedDeathsTree;
        expect(result.length).toBe(1);
        expect(result[0].children.length).toBe(1);
      });

      it('drops branches with no match anywhere in them', () => {
        const { component } = makeComponent();
        component.expectedDeathsTree = [node({ label: 'Dodoma' })];
        component.expectedDeathsSearch = 'no such place';
        component.onExpectedDeathsSearchChange();

        expect(component.filteredExpectedDeathsTree).toEqual([]);
      });
    });

    describe('expand/collapse', () => {
      it('toggles a key in and out of the expanded set', () => {
        const { component } = makeComponent();
        expect(component.isExpandedDeaths('k1')).toBe(false);

        component.toggleExpandDeaths('k1');
        expect(component.isExpandedDeaths('k1')).toBe(true);

        component.toggleExpandDeaths('k1');
        expect(component.isExpandedDeaths('k1')).toBe(false);
      });

      it('treats every node as expanded while a search is active', () => {
        const { component } = makeComponent();
        component.expectedDeathsSearch = 'dodoma';
        expect(component.isExpandedDeaths('never-toggled')).toBe(true);
      });
    });

    describe('editing a leaf value', () => {
      // Editing is now identified by (node key, period) - each visible year
      // column has its own independent edit affordance on the same row.
      it('starts editing with the value for the given period', () => {
        const { component } = makeComponent();
        component.startEditDeaths(node({ key: 'w1', is_leaf: true }), '2024');

        expect(component.editingDeathsValue).toBe('110');
        expect(component.isEditingDeaths('w1', '2024')).toBe(true);
        expect(component.isEditingDeaths('w1', '2023')).toBe(false);
      });

      it('handles editingDeathsValue arriving as an actual number, not a string', () => {
        // Regression: <input type="number"> uses Angular's NumberValueAccessor,
        // which writes a real `number` into the ngModel-bound field at
        // runtime despite its declared `string` type - calling .trim()
        // directly on it threw "not a function" the first time this was
        // exercised through the real DOM (unit tests that only ever assign
        // string literals never hit this).
        const { component, settingConfigService } = makeComponent();
        const leaf = node({ key: 'w1', is_leaf: true });
        component.startEditDeaths(leaf, '2023');
        (component as any).editingDeathsValue = 500;

        expect(() => component.saveEditDeaths(leaf, '2023')).not.toThrow();
        expect(settingConfigService.updateExpectedDeaths).toHaveBeenCalledWith('w1', '2023', 500);
      });

      it('rejects a non-numeric or negative value without calling the service', () => {
        const { component, settingConfigService } = makeComponent();
        const leaf = node({ key: 'w1', is_leaf: true });
        component.startEditDeaths(leaf, '2023');
        component.editingDeathsValue = '-5';

        component.saveEditDeaths(leaf, '2023');

        expect(settingConfigService.updateExpectedDeaths).not.toHaveBeenCalled();
        expect(component.editingDeathsError).toBeTruthy();
      });

      it('rounds a decimal entry to a whole number before saving', () => {
        const { component, settingConfigService } = makeComponent();
        const leaf = node({ key: 'w1', is_leaf: true });
        component.startEditDeaths(leaf, '2023');
        component.editingDeathsValue = '500.7';

        component.saveEditDeaths(leaf, '2023');

        expect(settingConfigService.updateExpectedDeaths).toHaveBeenCalledWith('w1', '2023', 501);
      });

      it('saves the given period and replaces the tree with the server response', () => {
        const { component, settingConfigService } = makeComponent();
        const newTree = [node({ key: 'w1', is_leaf: true, expected_deaths: { '2023': 500 } })];
        settingConfigService.updateExpectedDeaths.mockReturnValue(
          of({ data: { configured: true, max_level: 3, periods: ['2023'], tree: newTree } })
        );
        const leaf = node({ key: 'w1', is_leaf: true });
        component.startEditDeaths(leaf, '2023');
        component.editingDeathsValue = '500';

        component.saveEditDeaths(leaf, '2023');

        expect(settingConfigService.updateExpectedDeaths).toHaveBeenCalledWith('w1', '2023', 500);
        expect(component.expectedDeathsTree).toEqual(newTree);
        expect(component.editingDeathsCell).toBeNull();
      });

      it('leaves other period columns on the same row untouched while one is being edited', () => {
        const { component } = makeComponent();
        const leaf = node({ key: 'w1', is_leaf: true });
        component.startEditDeaths(leaf, '2023');

        expect(component.isEditingDeaths('w1', '2023')).toBe(true);
        expect(component.isEditingDeaths('w1', '2024')).toBe(false);
      });

      it('surfaces the backend rejection (e.g. editing a node with children) without closing the editor', () => {
        const { component, settingConfigService } = makeComponent();
        settingConfigService.updateExpectedDeaths.mockReturnValue(
          throwError(() => ({ error: { detail: 'Only an administrative unit with no children can be edited directly.' } }))
        );
        const leaf = node({ key: 'd1', is_leaf: true });
        component.startEditDeaths(leaf, '2023');
        component.editingDeathsValue = '75';

        component.saveEditDeaths(leaf, '2023');

        expect(component.editingDeathsError).toBe('Only an administrative unit with no children can be edited directly.');
        expect(component.editingDeathsSaving).toBe(false);
      });

      it('cancel clears the editing state', () => {
        const { component } = makeComponent();
        component.startEditDeaths(node({ key: 'w1', is_leaf: true }), '2023');
        component.cancelEditDeaths();

        expect(component.editingDeathsCell).toBeNull();
        expect(component.editingDeathsValue).toBe('');
      });
    });
  });
});
