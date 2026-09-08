import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaMapViewComponent } from './ccva-map-view.component';

// Same TestBed + fixture.detectChanges() pattern as
// maps/components/map-data/map-data.component.spec.ts - Leaflet
// initializes fine against jsdom's DOM, so ngAfterViewInit's L.map() call
// doesn't need mocking.
describe('CcvaMapViewComponent', () => {
  let component: CcvaMapViewComponent;
  let fixture: ComponentFixture<CcvaMapViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CcvaMapViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CcvaMapViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders without throwing when points are supplied before the first change detection', () => {
    component.points = [
      { va_id: 'uuid-1', lat: -6.3, lng: 34.8, gender: 'male', age_group: 'adult', cause1: 'Stroke', cause1_broad: 'Group II: Non-Communicable', locationLevel1: 'dodoma' },
      { va_id: 'uuid-2', lat: -6.8, lng: 39.2, gender: 'female', age_group: 'child', cause1: 'Malaria', cause1_broad: 'Group I: Communicable', locationLevel1: 'dar_es_salaam' },
    ];
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('re-renders on a later points/groupBy change without throwing', () => {
    fixture.detectChanges();
    component.points = [
      { va_id: 'uuid-3', lat: 0, lng: 0, gender: 'male', age_group: 'adult', cause1: null, cause1_broad: null, locationLevel1: null },
    ];
    component.groupBy = 'gender';
    expect(() => component.ngOnChanges({
      points: {} as any,
      groupBy: {} as any,
    })).not.toThrow();
  });

  describe('legendEntries', () => {
    const points = [
      { va_id: 'uuid-1', lat: -6.3, lng: 34.8, gender: 'male', age_group: 'adult', cause1: 'Stroke', cause1_broad: 'Group II: Non-Communicable', locationLevel1: 'dodoma' },
      { va_id: 'uuid-2', lat: -6.8, lng: 39.2, gender: 'female', age_group: 'child', cause1: 'Malaria', cause1_broad: 'Group I: Communicable', locationLevel1: 'dar_es_salaam' },
    ];

    it('is empty when the active Group By has no per-point color field (e.g. district)', () => {
      component.points = points;
      component.groupBy = 'district';
      expect(component.legendEntries).toEqual([]);
    });

    it('is empty on None', () => {
      component.points = points;
      component.groupBy = 'none';
      expect(component.legendEntries).toEqual([]);
    });

    it('uses the fixed Broad Category colors when grouped by broad', () => {
      component.points = points;
      component.groupBy = 'broad';
      const labels = component.legendEntries.map(e => e.label);
      expect(labels).toContain('Group I: Communicable');
      expect(labels).toContain('Group II: Non-Communicable');
      expect(labels).toContain('Group III: Injuries');
      expect(labels).toContain('Unusable');
    });

    it('lists only the distinct values actually present when grouped by gender', () => {
      component.points = points;
      component.groupBy = 'gender';
      expect(component.legendEntries.map(e => e.label)).toEqual(['female', 'male']);
    });
  });
});
