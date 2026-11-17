import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { VaRecordMapViewComponent } from './va-record-map-view.component';

// Same TestBed + fixture.detectChanges() pattern as CCVA's own
// app-ccva-map-view spec - Leaflet initializes fine against jsdom's DOM,
// so ngAfterViewInit's L.map() call doesn't need mocking. HttpClient(Testing)
// is needed transitively - DqaThresholdService (now injected, for classifying
// the 4 DQA Group By dimensions) loads its thresholds via SettingConfigService.
describe('VaRecordMapViewComponent', () => {
  let component: VaRecordMapViewComponent;
  let fixture: ComponentFixture<VaRecordMapViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VaRecordMapViewComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VaRecordMapViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders without throwing when points are supplied before the first change detection', () => {
    component.points = [
      { vaId: 'uuid-1', lat: -6.3, lng: 34.8, region: 'dodoma', district: 'Dodoma Urban', gender: 'male', ageGroup: 'Adult', ccvaCauseBroad: 'Group II: Non-Communicable', ccvaCauseMajor: 'Diseases of the circulatory system', ccvaCauseSpecific: 'Stroke', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
      { vaId: 'uuid-2', lat: -6.8, lng: 39.2, region: 'dar_es_salaam', district: 'Kinondoni', gender: 'female', ageGroup: 'Child', ccvaCauseBroad: 'Group I: Communicable', ccvaCauseMajor: 'Certain infectious and parasitic diseases', ccvaCauseSpecific: 'Malaria', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
    ];
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('re-renders on a later points/groupBy change without throwing', () => {
    fixture.detectChanges();
    component.points = [
      { vaId: 'uuid-3', lat: 0, lng: 0, region: null, district: null, gender: null, ageGroup: null, ccvaCauseBroad: null, ccvaCauseMajor: null, ccvaCauseSpecific: null, ccvaAlgorithm: null, dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
    ];
    component.groupBy = 'ccvaCauseBroad';
    expect(() => component.ngOnChanges({
      points: {} as any,
      groupBy: {} as any,
    })).not.toThrow();
  });

  // Maximize button / Escape-to-exit - a plain CSS overlay toggle (see
  // va-record-map-fullscreen in the stylesheet), not the native Fullscreen API.
  describe('fullscreen toggle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      fixture.detectChanges();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('starts out of fullscreen', () => {
      expect(component.isFullscreen).toBe(false);
    });

    it('toggleFullscreen flips the flag and re-measures the map after the layout settles', () => {
      const invalidateSize = jest.spyOn((component as any).map, 'invalidateSize');

      component.toggleFullscreen();
      expect(component.isFullscreen).toBe(true);
      jest.runAllTimers();
      expect(invalidateSize).toHaveBeenCalled();

      invalidateSize.mockClear();
      component.toggleFullscreen();
      expect(component.isFullscreen).toBe(false);
      jest.runAllTimers();
      expect(invalidateSize).toHaveBeenCalled();
    });

    it('Escape exits fullscreen', () => {
      component.toggleFullscreen();
      expect(component.isFullscreen).toBe(true);

      component.onEscapeKeydown();

      expect(component.isFullscreen).toBe(false);
    });

    it('Escape does nothing when not in fullscreen', () => {
      expect(component.isFullscreen).toBe(false);
      expect(() => component.onEscapeKeydown()).not.toThrow();
      expect(component.isFullscreen).toBe(false);
    });
  });

  describe('legendEntries', () => {
    const points = [
      { vaId: 'uuid-1', lat: -6.3, lng: 34.8, region: 'dodoma', district: 'Dodoma Urban', gender: 'male', ageGroup: 'Adult', ccvaCauseBroad: 'Group II: Non-Communicable', ccvaCauseMajor: 'Diseases of the circulatory system', ccvaCauseSpecific: 'Stroke', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
      { vaId: 'uuid-2', lat: -6.8, lng: 39.2, region: 'dar_es_salaam', district: 'Kinondoni', gender: 'female', ageGroup: 'Child', ccvaCauseBroad: 'Group I: Communicable', ccvaCauseMajor: 'Certain infectious and parasitic diseases', ccvaCauseSpecific: 'Malaria', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
    ];

    it('is empty on None', () => {
      component.points = points;
      component.groupBy = 'none';
      expect(component.legendEntries).toEqual([]);
    });

    it('uses the fixed Broad Category colors when grouped by ccvaCauseBroad', () => {
      component.points = points;
      component.groupBy = 'ccvaCauseBroad';
      const labels = component.legendEntries.map(e => e.label);
      expect(labels).toContain('Group I: Communicable');
      expect(labels).toContain('Group II: Non-Communicable');
      expect(labels).toContain('Group III: Injuries');
      expect(labels).toContain('Unusable');
    });

    it('lists only the distinct major-category values present when grouped by ccvaCauseMajor', () => {
      component.points = points;
      component.groupBy = 'ccvaCauseMajor';
      expect(component.legendEntries.map(e => e.label)).toEqual([
        'Certain infectious and parasitic diseases',
        'Diseases of the circulatory system',
      ]);
    });

    it('lists the distinct raw specific-cause values present when grouped by ccvaCauseSpecific', () => {
      component.points = points;
      component.groupBy = 'ccvaCauseSpecific';
      expect(component.legendEntries.map(e => e.label)).toEqual(['Malaria', 'Stroke']);
    });

    it('lists gender values capitalized when grouped by gender', () => {
      component.points = points;
      component.groupBy = 'gender';
      expect(component.legendEntries.map(e => e.label)).toEqual(['Female', 'Male']);
      expect(component.legendEntries.map(e => e.value)).toEqual(['female', 'male']);
    });

    it('lists age group values as-is when grouped by age_group', () => {
      component.points = points;
      component.groupBy = 'age_group';
      expect(component.legendEntries.map(e => e.label)).toEqual(['Adult', 'Child']);
    });
  });

  // Clicking a legend entry activates/deactivates it, same gesture as the
  // Monthly Submission chart's legend - here there's no per-value Chart.js
  // dataset to hide/show, so it drops that value's markers from the map
  // (and its cluster bubbles) directly instead.
  describe('legend entry toggling', () => {
    const points = [
      { vaId: 'uuid-1', lat: -6.3, lng: 34.8, region: 'dodoma', district: 'Dodoma Urban', gender: 'male', ageGroup: 'Adult', ccvaCauseBroad: 'Group II: Non-Communicable', ccvaCauseMajor: 'Diseases of the circulatory system', ccvaCauseSpecific: 'Stroke', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
      { vaId: 'uuid-2', lat: -6.8, lng: 39.2, region: 'dar_es_salaam', district: 'Kinondoni', gender: 'female', ageGroup: 'Child', ccvaCauseBroad: 'Group I: Communicable', ccvaCauseMajor: 'Certain infectious and parasitic diseases', ccvaCauseSpecific: 'Malaria', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
    ];

    it('starts with every legend value active', () => {
      component.points = points;
      component.groupBy = 'ccvaCauseSpecific';
      fixture.detectChanges();

      expect(component.legendEntries.every(e => !e.hidden)).toBe(true);
    });

    it('clicking a legend entry deactivates it and drops its markers from the map', () => {
      component.points = points;
      component.groupBy = 'ccvaCauseSpecific';
      fixture.detectChanges();

      component.toggleLegendEntry('Stroke');

      expect(component.legendEntries.find(e => e.value === 'Stroke')?.hidden).toBe(true);
      const remaining = (component as any).clusterGroup.getLayers().map((m: any) => m.vaPoint.vaId);
      expect(remaining).toEqual(['uuid-2']);
    });

    it('clicking a deactivated legend entry again reactivates it', () => {
      component.points = points;
      component.groupBy = 'ccvaCauseSpecific';
      fixture.detectChanges();

      component.toggleLegendEntry('Stroke');
      component.toggleLegendEntry('Stroke');

      expect(component.legendEntries.find(e => e.value === 'Stroke')?.hidden).toBe(false);
      expect((component as any).clusterGroup.getLayers()).toHaveLength(2);
    });

    it('changing groupBy clears deactivated values from the previous dimension', () => {
      component.points = points;
      component.groupBy = 'ccvaCauseSpecific';
      fixture.detectChanges();
      component.toggleLegendEntry('Stroke');

      component.groupBy = 'ccvaCauseBroad';
      component.ngOnChanges({ groupBy: {} as any });

      expect((component as any).hiddenGroupValues.size).toBe(0);
      expect((component as any).clusterGroup.getLayers()).toHaveLength(2);
    });
  });

  // Cluster bubbles - coloring/tooltip driven by the same breakdown, so a
  // "concentration" of one category is visible on the bubble itself (not
  // just in the legend, which only ever described individual dots).
  describe('cluster bubble coloring and hover breakdown', () => {
    const points = [
      { vaId: 'uuid-1', lat: -6.3, lng: 34.8, region: 'dodoma', district: 'Dodoma Urban', gender: 'male', ageGroup: 'Adult', ccvaCauseBroad: 'Group II: Non-Communicable', ccvaCauseMajor: 'Diseases of the circulatory system', ccvaCauseSpecific: 'Stroke', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
      { vaId: 'uuid-2', lat: -6.8, lng: 39.2, region: 'dar_es_salaam', district: 'Kinondoni', gender: 'female', ageGroup: 'Child', ccvaCauseBroad: 'Group I: Communicable', ccvaCauseMajor: 'Certain infectious and parasitic diseases', ccvaCauseSpecific: 'Malaria', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
      { vaId: 'uuid-3', lat: -6.8, lng: 39.2, region: 'dar_es_salaam', district: 'Kinondoni', gender: 'female', ageGroup: 'Child', ccvaCauseBroad: 'Group I: Communicable', ccvaCauseMajor: 'Certain infectious and parasitic diseases', ccvaCauseSpecific: 'Malaria', ccvaAlgorithm: 'InterVA5', dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
      { vaId: 'uuid-4', lat: -6.8, lng: 39.2, region: 'dar_es_salaam', district: 'Kinondoni', gender: 'female', ageGroup: 'Child', ccvaCauseBroad: null, ccvaCauseMajor: null, ccvaCauseSpecific: null, ccvaAlgorithm: null, dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
    ];

    function fakeMarkersFor(pts: typeof points) {
      return pts.map(p => ({ vaPoint: p } as any));
    }

    it('breakdownFor tallies by the active color field, most common first, with a fallback bucket for missing values', () => {
      component.groupBy = 'ccvaCauseBroad';
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
      component.groupBy = 'ccvaCauseBroad';
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
      component.groupBy = 'ccvaCauseBroad';
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

  // Table 2's own 4 Group By dimensions - unlike the categorical fields
  // above, these classify a raw score (dqaRrs/dqaIcs/dqaIci/dqaAid) into a
  // tier client-side via DqaThresholdService, using the shipped default
  // thresholds (DQA_ANALYTICS hasn't been customized in these tests).
  describe('DQA score Group By dimensions', () => {
    const points = [
      { vaId: 'uuid-1', lat: -6.3, lng: 34.8, region: 'dodoma', district: 'Dodoma Urban', gender: 'male', ageGroup: 'Adult', ccvaCauseBroad: null, ccvaCauseMajor: null, ccvaCauseSpecific: null, ccvaAlgorithm: null, dqaRrs: 90, dqaIcs: null, dqaIci: null, dqaAid: null },
      { vaId: 'uuid-2', lat: -6.8, lng: 39.2, region: 'dar_es_salaam', district: 'Kinondoni', gender: 'female', ageGroup: 'Child', ccvaCauseBroad: null, ccvaCauseMajor: null, ccvaCauseSpecific: null, ccvaAlgorithm: null, dqaRrs: 30, dqaIcs: null, dqaIci: null, dqaAid: null },
      { vaId: 'uuid-3', lat: -6.8, lng: 39.2, region: 'dar_es_salaam', district: 'Kinondoni', gender: 'female', ageGroup: 'Child', ccvaCauseBroad: null, ccvaCauseMajor: null, ccvaCauseSpecific: null, ccvaAlgorithm: null, dqaRrs: null, dqaIcs: null, dqaIci: null, dqaAid: null },
    ];

    it('legendEntries lists the 3 fixed RRS tier labels when grouped by dqaRrs', () => {
      component.groupBy = 'dqaRrs';
      expect(component.legendEntries.map(e => e.label)).toEqual(['Excellent', 'Good', 'Critical']);
    });

    it('colors a marker by its classified tier, not a per-value color map', () => {
      component.points = points;
      component.groupBy = 'dqaRrs';
      fixture.detectChanges();

      const excellent = (component as any).markerColor(points[0]); // 90 -> Excellent (green)
      const critical = (component as any).markerColor(points[1]);  // 30 -> Critical (red)
      expect(excellent).not.toBe(critical);
      expect(excellent).toBe('#10b981');
      expect(critical).toBe('#ef4444');
    });

    it('falls back to the default marker color when this record has no score yet (DQA not run)', () => {
      expect((component as any).markerColor(points[2])).toBe('#3b82f6');
    });

    it('breakdownFor tallies by tier label, bucketing unscored records as Unclassified', () => {
      component.points = points;
      component.groupBy = 'dqaRrs';
      fixture.detectChanges(); // populates currentColorMap via renderMarkers()
      const breakdown = (component as any).breakdownFor(points.map(p => ({ vaPoint: p })));
      expect(breakdown).toEqual(expect.arrayContaining([
        { value: 'Excellent', label: 'Excellent', color: '#10b981', count: 1 },
        { value: 'Critical', label: 'Critical', color: '#ef4444', count: 1 },
        { value: 'Unclassified', label: 'Unclassified', color: '#9ca3af', count: 1 },
      ]));
    });
  });
});
