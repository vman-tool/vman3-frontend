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
      { va_id: 'uuid-1', lat: -6.3, lng: 34.8, gender: 'male', age_group: 'adult', cause1: 'Stroke', cause1_major: 'Diseases of the circulatory system', cause1_broad: 'Group II: Non-Communicable', locationLevel1: 'dodoma' },
      { va_id: 'uuid-2', lat: -6.8, lng: 39.2, gender: 'female', age_group: 'child', cause1: 'Malaria', cause1_major: 'Certain infectious and parasitic diseases', cause1_broad: 'Group I: Communicable', locationLevel1: 'dar_es_salaam' },
    ];
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('re-renders on a later points/groupBy change without throwing', () => {
    fixture.detectChanges();
    component.points = [
      { va_id: 'uuid-3', lat: 0, lng: 0, gender: 'male', age_group: 'adult', cause1: null, cause1_major: null, cause1_broad: null, locationLevel1: null },
    ];
    component.groupBy = 'gender';
    expect(() => component.ngOnChanges({
      points: {} as any,
      groupBy: {} as any,
    })).not.toThrow();
  });

  describe('legendEntries', () => {
    const points = [
      { va_id: 'uuid-1', lat: -6.3, lng: 34.8, gender: 'male', age_group: 'adult', cause1: 'Stroke', cause1_major: 'Diseases of the circulatory system', cause1_broad: 'Group II: Non-Communicable', locationLevel1: 'dodoma' },
      { va_id: 'uuid-2', lat: -6.8, lng: 39.2, gender: 'female', age_group: 'child', cause1: 'Malaria', cause1_major: 'Certain infectious and parasitic diseases', cause1_broad: 'Group I: Communicable', locationLevel1: 'dar_es_salaam' },
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

    it('lists only the distinct values actually present when grouped by gender, capitalized', () => {
      component.points = points;
      component.groupBy = 'gender';
      expect(component.legendEntries.map(e => e.label)).toEqual(['Female', 'Male']);
    });

    it('lists the distinct major-category values present when grouped by major - regression for it silently rendering plain markers', () => {
      component.points = points;
      component.groupBy = 'major';
      expect(component.legendEntries.map(e => e.label)).toEqual([
        'Certain infectious and parasitic diseases',
        'Diseases of the circulatory system',
      ]);
    });
  });

  // Cluster bubbles - coloring/tooltip driven by the same breakdown, so a
  // "concentration" of one category is visible on the bubble itself (not
  // just in the legend, which only ever described individual dots).
  describe('cluster bubble coloring and hover breakdown', () => {
    const points = [
      { va_id: 'uuid-1', lat: -6.3, lng: 34.8, gender: 'male', age_group: 'adult', cause1: 'Stroke', cause1_major: 'Diseases of the circulatory system', cause1_broad: 'Group II: Non-Communicable', locationLevel1: 'dodoma' },
      { va_id: 'uuid-2', lat: -6.8, lng: 39.2, gender: 'female', age_group: 'child', cause1: 'Malaria', cause1_major: 'Certain infectious and parasitic diseases', cause1_broad: 'Group I: Communicable', locationLevel1: 'dar_es_salaam' },
      { va_id: 'uuid-3', lat: -6.8, lng: 39.2, gender: 'female', age_group: 'child', cause1: 'Malaria', cause1_major: 'Certain infectious and parasitic diseases', cause1_broad: 'Group I: Communicable', locationLevel1: 'dar_es_salaam' },
      { va_id: 'uuid-4', lat: -6.8, lng: 39.2, gender: 'female', age_group: 'child', cause1: null, cause1_major: null, cause1_broad: null, locationLevel1: 'dar_es_salaam' },
    ];

    function fakeMarkersFor(pts: typeof points) {
      return pts.map(p => ({ ccvaPoint: p } as any));
    }

    it('breakdownFor tallies by the active color field, most common first, with a fallback bucket for missing values', () => {
      component.groupBy = 'broad';
      component.points = points;
      (component as any).currentColorMap = {};

      const breakdown = (component as any).breakdownFor(fakeMarkersFor(points));

      // Sorted by count desc; ties keep their first-seen order (uuid-1's
      // Group II is seen before uuid-4's Unclassified).
      expect(breakdown).toEqual([
        { value: 'Group I: Communicable', label: 'Group I: Communicable', color: expect.any(String), count: 2 },
        { value: 'Group II: Non-Communicable', label: 'Group II: Non-Communicable', color: expect.any(String), count: 1 },
        { value: 'Unclassified', label: 'Unclassified', color: '#9ca3af', count: 1 },
      ]);
    });

    it('breakdownFor is empty when there is no active grouping', () => {
      component.groupBy = 'none';
      expect((component as any).breakdownFor(fakeMarkersFor(points))).toEqual([]);
    });

    it('pieGradient produces a conic-gradient covering the full circle', () => {
      const breakdown = [
        { value: 'a', label: 'A', color: '#111111', count: 3 },
        { value: 'b', label: 'B', color: '#222222', count: 1 },
      ];
      const gradient = (component as any).pieGradient(breakdown, 4);

      expect(gradient).toContain('conic-gradient(');
      expect(gradient).toContain('#111111 0deg 270deg');
      expect(gradient).toContain('#222222 270deg 360deg');
    });

    it('clusterTooltip reports each category\'s exact count and percentage', () => {
      const breakdown = [
        { value: 'a', label: 'Group I: Communicable', color: '#111111', count: 3 },
        { value: 'b', label: 'Group II: Non-Communicable', color: '#222222', count: 1 },
      ];
      const html = (component as any).clusterTooltip(4, breakdown);

      expect(html).toContain('4 VA records');
      expect(html).toContain('Group I: Communicable');
      expect(html).toContain('3 (75.0%)');
      expect(html).toContain('Group II: Non-Communicable');
      expect(html).toContain('1 (25.0%)');
    });

    it('clusterIcon does not bind a tooltip by default, even with a grouping active - the pop-up is opt-in', () => {
      component.groupBy = 'broad';
      component.points = points;
      (component as any).currentColorMap = {};
      expect(component.showBreakdownPopup).toBe(false);

      const fakeCluster = {
        getAllChildMarkers: () => fakeMarkersFor(points),
        bindTooltip: jest.fn(),
        unbindTooltip: jest.fn(),
      };

      const icon = (component as any).clusterIcon(fakeCluster);

      expect(fakeCluster.bindTooltip).not.toHaveBeenCalled();
      expect(fakeCluster.unbindTooltip).toHaveBeenCalledTimes(1);
      // The bubble itself is still pie-colored - only the hover tooltip is gated.
      expect(icon.options.html).toContain('conic-gradient');
      expect(icon.options.html).toContain('>4<');
    });

    it('clusterIcon binds a breakdown tooltip once showBreakdownPopup is turned on', () => {
      component.groupBy = 'broad';
      component.points = points;
      component.showBreakdownPopup = true;
      (component as any).currentColorMap = {};

      const fakeCluster = {
        getAllChildMarkers: () => fakeMarkersFor(points),
        bindTooltip: jest.fn(),
        unbindTooltip: jest.fn(),
      };

      const icon = (component as any).clusterIcon(fakeCluster);

      expect(fakeCluster.bindTooltip).toHaveBeenCalledTimes(1);
      const [tooltipHtml] = fakeCluster.bindTooltip.mock.calls[0];
      expect(tooltipHtml).toContain('4 VA records');
      expect(icon.options.html).toContain('conic-gradient');
      expect(icon.options.html).toContain('>4<'); // the count badge in the middle
    });

    it('clusterIcon falls back to a plain count bubble with no tooltip when there is no active grouping', () => {
      component.groupBy = 'none';
      component.points = points;
      component.showBreakdownPopup = true;

      const fakeCluster = {
        getAllChildMarkers: () => fakeMarkersFor(points),
        bindTooltip: jest.fn(),
        unbindTooltip: jest.fn(),
      };

      const icon = (component as any).clusterIcon(fakeCluster);

      expect(fakeCluster.bindTooltip).not.toHaveBeenCalled();
      expect(fakeCluster.unbindTooltip).toHaveBeenCalledTimes(1);
      expect(icon.options.html).not.toContain('conic-gradient');
      expect(icon.options.html).toContain('>4<');
    });

    it('pieClusterIcon masks out a real hole in the center so the basemap shows through behind the count', () => {
      const breakdown = [{ value: 'a', label: 'A', color: '#111111', count: 4 }];
      const icon = (component as any).pieClusterIcon(4, breakdown, 40, 13);

      expect(icon.options.html).toContain('mask:radial-gradient(circle closest-side, transparent 0 55%, black 56% 100%)');
      expect(icon.options.html).not.toContain('background:rgba(255,255,255,0.9)');
    });

    it('onToggleBreakdownPopup refreshes the cluster icons so bind/unbind takes effect immediately', () => {
      const refreshClusters = jest.fn();
      (component as any).clusterGroup = { refreshClusters };

      component.onToggleBreakdownPopup();

      expect(refreshClusters).toHaveBeenCalledTimes(1);
    });
  });
});
