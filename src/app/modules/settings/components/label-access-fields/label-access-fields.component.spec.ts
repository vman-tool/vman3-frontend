import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';

import { LabelAccessFieldsComponent } from './label-access-fields.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('LabelAccessFieldsComponent', () => {
  let component: LabelAccessFieldsComponent;
  let fixture: ComponentFixture<LabelAccessFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelAccessFieldsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabelAccessFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// Constructed directly, without TestBed/template compilation, since the
// methods under test here are plain component-class logic.
describe('LabelAccessFieldsComponent (unit)', () => {
  function makeComponent() {
    const genericIndexedDbService = {} as any;
    const settingConfigService = {} as any;
    const snackBar = { open: jest.fn() } as any;
    const formBuilder = new FormBuilder();

    return new LabelAccessFieldsComponent(genericIndexedDbService, settingConfigService, snackBar, formBuilder);
  }

  describe('getLocationFields', () => {
    it('pairs each admin level label with its mapped field from field_mapping', () => {
      const component = makeComponent();
      component.system_config = { admin_level1: 'Region', admin_level2: 'District', admin_level3: '', admin_level4: '' };
      component.field_mapping = { location_level1: 'region', location_level2: 'district' };

      component.getLocationFields();

      expect(component.locationTypes).toEqual([
        { label: 'Region', value: 'region' },
        { label: 'District', value: 'district' },
        { label: '', value: undefined },
        { label: '', value: undefined },
      ]);
    });
  });

  describe('locationTypeOptions', () => {
    it('always leads with a blank "Not selected" option', () => {
      const component = makeComponent();
      component.locationTypes = [];

      expect(component.locationTypeOptions[0]).toEqual({ value: '', label: 'Not selected' });
    });

    it('leaves out levels with no field mapped', () => {
      const component = makeComponent();
      component.locationTypes = [
        { label: 'Region', value: 'region' },
        { label: 'GPS', value: '' },
        { label: undefined, value: undefined },
      ];

      expect(component.locationTypeOptions).toEqual([
        { value: '', label: 'Not selected' },
        { value: 'region', label: 'Region' },
      ]);
    });

    // Regression: a level can have its field mapped but its display label
    // (e.g. admin_level4) left blank - this used to render as an
    // empty-looking dropdown option instead of falling back to the field.
    it('falls back to the raw field name when the label is blank', () => {
      const component = makeComponent();
      component.locationTypes = [{ label: '', value: 'admin_level4_field' }];

      expect(component.locationTypeOptions).toEqual([
        { value: '', label: 'Not selected' },
        { value: 'admin_level4_field', label: 'admin_level4_field' },
      ]);
    });
  });

  describe('getFilteredLocations', () => {
    it('matches on name or value, case-insensitively', () => {
      const component = makeComponent();
      component.locations = [
        { name: 'North Region', value: 'north', unique: 'north' },
        { name: 'South Region', value: 'south', unique: 'south' },
        { name: 'Unnamed', value: 'WEST', unique: 'WEST' },
      ];
      component.searchText = 'nor';

      expect(component.getFilteredLocations().map((l) => l.value)).toEqual(['north']);
    });

    it('matches by raw value when the search term does not appear in the name', () => {
      const component = makeComponent();
      component.locations = [{ name: 'Unnamed', value: 'WEST', unique: 'WEST' }];
      component.searchText = 'west';

      expect(component.getFilteredLocations().map((l) => l.value)).toEqual(['WEST']);
    });

    it('returns everything when the search term is empty', () => {
      const component = makeComponent();
      component.locations = [
        { name: 'North', value: 'north', unique: 'north' },
        { name: 'South', value: 'south', unique: 'south' },
      ];
      component.searchText = '';

      expect(component.getFilteredLocations()).toHaveLength(2);
    });
  });

  describe('createForm', () => {
    it('seeds each control from the location name, blank when the name is just the raw value', () => {
      const component = makeComponent();
      component.locations = [
        { name: 'North', value: 'north', unique: 'north' },
        { name: 'south', value: 'south', unique: 'south' },
      ];

      component.createForm();

      expect(component.labelsForm.value).toEqual({ north: 'North', south: '' });
    });

    it('carries a previously-entered value forward across a re-filter', () => {
      const component = makeComponent();
      component.locations = [{ name: 'North', value: 'north', unique: 'north' }];
      component.createForm();
      component.labelsForm.get('north')!.setValue('Northern Province');

      // Simulates onSearch() narrowing the visible set and rebuilding the
      // form - the edit made above must not be lost.
      component.createForm();

      expect(component.labelsForm.value).toEqual({ north: 'Northern Province' });
    });
  });
});
