import { of } from 'rxjs';
import { DatePipe } from '@angular/common';

import { DataExportComponent } from './data-export.component';

// Constructed directly, without TestBed/template compilation - same style
// used for CcvaResultsComponent's unit tests: plain component-class logic
// driven through mocked collaborators.
describe('DataExportComponent (unit)', () => {
  function makeComponent(options: { accessLimit?: any; hasPrivilege?: boolean } = {}) {
    const dataSyncService = {
      getExportToken: jest.fn().mockReturnValue(of({ token: 'export-token' })),
    } as any;
    const settingConfigService = {
      getSettingsConfig: jest.fn().mockReturnValue(of({
        field_mapping: { location_level1: 'region', location_level2: 'district', location_level3: 'ward' },
        system_configs: { admin_level1: 'Region', admin_level2: 'District', admin_level3: 'Ward' },
      })),
    } as any;
    const usersService = {
      getUserRoles: jest.fn().mockReturnValue(of({ data: { access_limit: options.accessLimit ?? null } })),
    } as any;
    const configService = { API_URL: 'http://api.test' } as any;
    const datePipe = new DatePipe('en-US');
    const snackBar = { open: jest.fn() } as any;
    const authService = {
      hasPrivilege: jest.fn().mockReturnValue(of(options.hasPrivilege ?? false)),
    } as any;

    const component = new DataExportComponent(
      dataSyncService, settingConfigService, usersService, configService, datePipe, snackBar, authService
    );
    return { component, dataSyncService, settingConfigService, usersService, configService, snackBar, authService };
  }

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe('initLocationAccess (via ngOnInit)', () => {
    it('defaults to the full location hierarchy and no pre-selection for an unrestricted user', async () => {
      localStorage.setItem('current_user', JSON.stringify({ uuid: 'user-1' }));
      const { component } = makeComponent({ accessLimit: { limit_by: [] } });

      // initLocationAccess is private and chains two sequential
      // lastValueFrom() calls - awaited directly here rather than via
      // ngOnInit() (which fires it without awaiting) so the assertions
      // below see its fully-settled state.
      await (component as any).initLocationAccess();

      expect(component.locationTypes.map(l => l.value)).toEqual(['region', 'district', 'ward']);
      expect(component.creatorBoundary).toEqual([]);
      expect(component.selectedLocations).toEqual([]);
      expect(component.isLoadingLocationAccess).toBe(false);
    });

    it('pre-selects the current user\'s own organization unit when access-limited', async () => {
      localStorage.setItem('current_user', JSON.stringify({ uuid: 'user-2' }));
      const { component } = makeComponent({
        accessLimit: { limit_by: [{ field: 'district', value: 'kongwa_dc', label: 'Kongwa DC' }] },
      });

      await (component as any).initLocationAccess();

      expect(component.creatorBoundary).toEqual([
        { field: 'district', field_label: 'District', label: 'Kongwa DC', value: 'kongwa_dc' },
      ]);
      expect(component.selectedLocations).toEqual(component.creatorBoundary);
      // Only District and Ward (level >= the user's own level 2 boundary) -
      // Region is above their own access and shouldn't be offered.
      expect(component.locationTypes.map(l => l.value)).toEqual(['district', 'ward']);
    });

    it('supports the legacy access_limit shape (a single top-level field)', async () => {
      localStorage.setItem('current_user', JSON.stringify({ uuid: 'user-3' }));
      const { component } = makeComponent({
        accessLimit: { field: 'region', limit_by: [{ value: 'dodoma' }] },
      });

      await (component as any).initLocationAccess();

      expect(component.creatorBoundary).toEqual([
        { field: 'region', field_label: 'Region', label: 'dodoma', value: 'dodoma' },
      ]);
    });

    it('checks the PCVA/CCVA export privilege independently of location access', async () => {
      localStorage.setItem('current_user', JSON.stringify({ uuid: 'user-1' }));
      const { component } = makeComponent({ accessLimit: {}, hasPrivilege: true });

      component.ngOnInit();
      await Promise.resolve();

      expect(component.canExportPcvaCcva).toBe(true);
    });
  });

  describe('onLocationSelectionChange', () => {
    it('updates selectedLocations from the tree component', () => {
      const { component } = makeComponent();
      const selection = [{ field: 'region', field_label: 'Region', label: 'Dodoma', value: 'dodoma' }];

      component.onLocationSelectionChange(selection);

      expect(component.selectedLocations).toBe(selection);
    });
  });

  describe('exportData', () => {
    function mockFetchOk(): jest.Mock {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
      });
      (global as any).fetch = fetchMock;
      // jsdom doesn't implement these - stub them so the download-trigger
      // code path doesn't throw.
      (global as any).URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
      (global as any).URL.revokeObjectURL = jest.fn();
      return fetchMock;
    }

    it('omits the locations param when nothing is selected', async () => {
      const fetchMock = mockFetchOk();
      const { component } = makeComponent();
      component.selectedLocations = [];

      component.exportData();
      await Promise.resolve();
      await Promise.resolve();

      const url: string = fetchMock.mock.calls[0][0];
      expect(url).not.toContain('locations=');
    });

    it('includes the selected organization unit(s) as the locations param', async () => {
      const fetchMock = mockFetchOk();
      const { component } = makeComponent();
      component.selectedLocations = [
        { field: 'region', field_label: 'Region', label: 'Dodoma', value: 'dodoma' },
      ];

      component.exportData();
      await Promise.resolve();
      await Promise.resolve();

      const url: string = fetchMock.mock.calls[0][0];
      expect(url).toContain(`locations=${encodeURIComponent(JSON.stringify([{ field: 'region', value: 'dodoma' }]))}`);
    });
  });
});
