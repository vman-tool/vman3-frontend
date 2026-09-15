import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { of } from 'rxjs';

import { MapDataComponent } from './map-data.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MapDataService } from '../../services/map-data.service';
import { GeneralDqaService } from 'app/modules/data-quality/services/general-dqa.service';

describe('MapDataComponent', () => {
  let component: MapDataComponent;
  let fixture: ComponentFixture<MapDataComponent>;
  let mapDataService: { getMapRecordsData: jest.Mock; getDqaMapPoints: jest.Mock };
  let generalDqaService: { getAnalyticsSnapshot: jest.Mock };

  function setup(snapshot: any = { data: { status: 'completed', computed_at: '2026-09-13T00:00:00Z' } }) {
    mapDataService = {
      getMapRecordsData: jest.fn().mockReturnValue(of({ data: [] })),
      getDqaMapPoints: jest.fn().mockReturnValue(of({ data: [] })),
    };
    generalDqaService = { getAnalyticsSnapshot: jest.fn().mockReturnValue(of(snapshot)) };

    TestBed.configureTestingModule({
      declarations: [MapDataComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DatePipe,
        { provide: MapDataService, useValue: mapDataService },
        { provide: GeneralDqaService, useValue: generalDqaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  describe('DQA availability - the dropdown only shows "whenever they are available"', () => {
    it('is available once a completed snapshot exists', () => {
      setup({ data: { status: 'completed', computed_at: '2026-09-13T00:00:00Z' } });
      expect(component.dqaAvailable).toBe(true);
      expect(component.dqaComputedAt).toBe('2026-09-13T00:00:00Z');
    });

    it('is unavailable when no snapshot has ever completed', () => {
      setup({ data: null });
      expect(component.dqaAvailable).toBe(false);
    });

    it('is unavailable while a snapshot is still running', () => {
      setup({ data: { status: 'running', computed_at: null } });
      expect(component.dqaAvailable).toBe(false);
    });
  });

  describe('onDqaIndicatorChange', () => {
    it('reverts to plain VA-record markers when switched back to none', () => {
      setup();
      mapDataService.getMapRecordsData.mockClear();

      component.dqaIndicator = 'none';
      component.onDqaIndicatorChange();

      expect(mapDataService.getMapRecordsData).toHaveBeenCalledTimes(1);
      expect(mapDataService.getDqaMapPoints).not.toHaveBeenCalled();
    });

    it('fetches DQA map points and computes the legend when an indicator is selected', () => {
      setup();

      component.dqaIndicator = 'rrs';
      component.onDqaIndicatorChange();

      expect(mapDataService.getDqaMapPoints).toHaveBeenCalledTimes(1);
      // Default RRS thresholds: Excellent/Good/Critical (see DEFAULT_DQA_THRESHOLDS).
      expect(component.dqaLegendEntries.map(e => e.label)).toEqual(['Excellent', 'Good', 'Critical']);
    });

    it('computes a different legend for aid (Too Short/Normal/Too Long, not ordered severity)', () => {
      setup();

      component.dqaIndicator = 'aid';
      component.onDqaIndicatorChange();

      expect(component.dqaLegendEntries.map(e => e.label)).toEqual(['Too Short', 'Normal', 'Too Long']);
    });
  });

  describe('the floating DQA control on the map', () => {
    // The control is plain DOM (same pattern as the existing stats
    // control), added to the map's own topright corner - not an Angular
    // template - so these query the real rendered Leaflet DOM rather than
    // the component fixture's own template. All 4 indicators (plus None)
    // are radio buttons shown at once, same presentation as the
    // Street/Satellite/Topographic switcher right above it - not a
    // dropdown.
    function dqaRadios(): HTMLInputElement[] {
      return Array.from(document.querySelectorAll('.leaflet-top.leaflet-right input[type="radio"][name="dqaIndicatorRadio"]'));
    }

    function dqaRadioLabels(): string[] {
      return dqaRadios().map(r => r.parentElement?.textContent?.trim() ?? '');
    }

    it('is disabled ("you cannot select") when no DQA snapshot is available', () => {
      setup({ data: null });
      const radios = dqaRadios();
      expect(radios.length).toBe(5);
      expect(radios.every(r => r.disabled)).toBe(true);
      expect(radios[0].closest('.leaflet-control-layers')?.textContent).toContain('Not available yet');
    });

    it('presents all 4 indicators plus None at once, enabled, once a snapshot is available', () => {
      setup({ data: { status: 'completed', computed_at: '2026-09-13T00:00:00Z' } });
      const radios = dqaRadios();
      expect(dqaRadioLabels()).toEqual(['None', 'RRS', 'ICS', 'ICI', 'AID']);
      expect(radios.every(r => !r.disabled)).toBe(true);
      expect(radios.find(r => r.value === 'none')?.checked).toBe(true);
    });

    it('updates the map (calls onDqaIndicatorChange) when the user picks an indicator', () => {
      setup({ data: { status: 'completed', computed_at: '2026-09-13T00:00:00Z' } });
      mapDataService.getDqaMapPoints.mockClear();

      const rrsRadio = dqaRadios().find(r => r.value === 'rrs')!;
      rrsRadio.checked = true;
      rrsRadio.dispatchEvent(new Event('change'));

      expect(component.dqaIndicator).toBe('rrs');
      expect(mapDataService.getDqaMapPoints).toHaveBeenCalledTimes(1);
    });

    describe('showing each indicator\'s calculated average on its own label', () => {
      const snapshotWithAverages = {
        data: {
          status: 'completed',
          computed_at: '2026-09-13T00:00:00Z',
          rrs: { overall: { avg: 84.06, min_v: 0, max_v: 100, stddev: 5, p50: 85, count: 100 } },
          ics: { overall: { avg: 91.2, min_v: 0, max_v: 100, stddev: 5, p50: 92, count: 100 } },
          // ICI's overall figure is a top-level field (IciStats), not
          // nested under .overall.avg like the other three (GroupedStats).
          ici: { overall_ici: 97.5, overall_total: 100, overall_passed: 97, interviewers: [], checks_applied: [] },
          aid: { overall: { avg: 42.34, min_v: 0, max_v: 480, stddev: 10, p50: 40, count: 100 } },
        },
      };

      it('appends the rounded (1dp) average to RRS/ICS/ICI, reading ICI from its own overall_ici field', () => {
        setup(snapshotWithAverages);
        expect(component.dqaAverages).toEqual({ rrs: 84.06, ics: 91.2, ici: 97.5, aid: 42.34 });
        expect(dqaRadioLabels()).toEqual(['None', 'RRS 84.1', 'ICS 91.2', 'ICI 97.5', 'AID 42.3 min']);
      });

      it('keeps the bare label for an indicator with no computable average', () => {
        setup({ data: { status: 'completed', computed_at: '2026-09-13T00:00:00Z', rrs: { overall: { avg: 84.06 } } } });
        expect(dqaRadioLabels()).toEqual(['None', 'RRS 84.1', 'ICS', 'ICI', 'AID']);
      });
    });
  });

  describe('loadData while a DQA indicator is active', () => {
    it('re-fetches DQA points instead of reverting to plain markers on a filter change', () => {
      setup();
      component.dqaIndicator = 'ics';
      mapDataService.getDqaMapPoints.mockClear();
      mapDataService.getMapRecordsData.mockClear();

      component.loadData();

      expect(mapDataService.getDqaMapPoints).toHaveBeenCalledTimes(1);
      expect(mapDataService.getMapRecordsData).not.toHaveBeenCalled();
    });
  });
});
