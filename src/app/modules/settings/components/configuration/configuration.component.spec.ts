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
});
