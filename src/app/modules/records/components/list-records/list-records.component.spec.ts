import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ListRecordsComponent } from './list-records.component';
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
});
