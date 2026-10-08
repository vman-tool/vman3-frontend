import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Observable } from 'rxjs';

import { GeneralDqaComponent, INDICATOR_INFO, ActiveCard } from './general-dqa.component';
import { GeneralDqaService, DqaTrendPoint } from '../../services/general-dqa.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

const emptyDistStat = { avg: 0, min_v: 0, max_v: 0, stddev: 0, p50: 0, count: 0 };

describe('GeneralDqaComponent', () => {
  let component: GeneralDqaComponent;
  let fixture: ComponentFixture<GeneralDqaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GeneralDqaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .compileComponents();

    fixture = TestBed.createComponent(GeneralDqaComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Median Interview Duration (the "duration" card)', () => {
    // Regression test: this card used to read .avg (the mean), which is
    // misleading for a right-skewed duration distribution. It must read
    // .p50 (the median), matching its "Median Interview Duration" label
    // and the vman_dq manuscript's own MID definition.
    function loadSnapshotWithDuration(avg: number, p50: number) {
      const service = TestBed.inject(GeneralDqaService);
      jest.spyOn(service, 'getAnalyticsSnapshot').mockReturnValue(of({
        data: {
          status: 'completed',
          computed_at: '2026-01-01T00:00:00Z',
          rrs: null,
          ics: null,
          ici: null,
          aid: {
            overall: { avg, min_v: 1, max_v: 400, stddev: 50, p50, count: 100 },
            by_age_group: { adults: emptyDistStat, children: emptyDistStat, neonates: emptyDistStat },
            by_gender_adult: { male_adults: emptyDistStat, female_adults: emptyDistStat },
          },
        },
      } as any));
      fixture.detectChanges();
    }

    it('shows the median in the KPI card value, not the mean', () => {
      loadSnapshotWithDuration(90, 35);
      expect(component.overallDuration).toBe('35 min');
      expect(component.overallDuration).not.toBe('1h 30m');
    });

    it('classifies the tier badge off the median, not the mean', () => {
      // Default AID thresholds: <30min = Too Short, 30-60min = Normal
      // (no badge shown), >60min = Too Long. avg=90 would badge "Too Long";
      // p50=10 would badge "Too Short" - using a value on the opposite
      // side of Normal from avg makes this a meaningful regression check,
      // not just "no badge".
      loadSnapshotWithDuration(90, 10);
      expect(component.overallDurationTier?.label).toBe('Too Short');
    });

    it('labels the breakdown table column "Median Duration", not "Avg Duration"', () => {
      loadSnapshotWithDuration(90, 35);
      component.activeCard = 'duration';
      expect(component.activeCardLabel).toBe('Median Duration');
    });

    it('activeCentralValue reads p50 for duration and avg for every other indicator', () => {
      fixture.detectChanges();
      const stat = { avg: 90, min_v: 1, max_v: 400, stddev: 50, p50: 35, count: 100 };

      component.activeCard = 'duration';
      expect(component.activeCentralValue(stat)).toBe(35);

      component.activeCard = 'rrs';
      expect(component.activeCentralValue(stat)).toBe(90);
    });

    it('durationRowTier classifies a breakdown row off its own median, not its mean', () => {
      fixture.detectChanges();
      const stat = { avg: 90, min_v: 1, max_v: 400, stddev: 50, p50: 10, count: 100 };
      expect(component.durationRowTier(stat)?.label).toBe('Too Short');
    });
  });

  describe('indicator methodology popup', () => {
    it('is closed by default', () => {
      fixture.detectChanges();
      expect(component.infoCard).toBeNull();
    });

    it('openInfo opens the popup for the given card and stops the click from also switching activeCard', () => {
      fixture.detectChanges();
      component.activeCard = 'rrs';
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.openInfo('ics', event);

      expect(component.infoCard).toBe('ics');
      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(component.activeCard).toBe('rrs'); // unchanged
    });

    it('closeInfo clears it', () => {
      fixture.detectChanges();
      component.infoCard = 'ici';
      component.closeInfo();
      expect(component.infoCard).toBeNull();
    });

    it('re-opening the same card\'s (i) button toggles the popup closed', () => {
      fixture.detectChanges();
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.openInfo('duration', event);
      expect(component.infoCard).toBe('duration');

      component.openInfo('duration', event);
      expect(component.infoCard).toBeNull();
    });

    it('opening a different card\'s (i) button while one is open switches to the new card, not toggle it shut', () => {
      fixture.detectChanges();
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.openInfo('rrs', event);
      component.openInfo('ici', event);

      expect(component.infoCard).toBe('ici');
    });

    it('a click anywhere closes an open popup (the outside-click handler)', () => {
      fixture.detectChanges();
      component.infoCard = 'ics';

      component.onDocumentClickForInfoPopup();

      expect(component.infoCard).toBeNull();
    });

    it('the outside-click handler is a no-op when nothing is open', () => {
      fixture.detectChanges();
      component.infoCard = null;
      expect(() => component.onDocumentClickForInfoPopup()).not.toThrow();
      expect(component.infoCard).toBeNull();
    });

    it('provides methodology content for all 4 cards, each with a formula and at least one tier', () => {
      const cards: ActiveCard[] = ['rrs', 'ics', 'ici', 'duration'];
      for (const card of cards) {
        const info = INDICATOR_INFO[card];
        expect(info.name).toBeTruthy();
        expect(info.summary).toBeTruthy();
        expect(info.formula).toBeTruthy();
        expect(info.tiers.length).toBeGreaterThan(0);
        expect(info.notes.length).toBeGreaterThan(0);
      }
    });

    it('names the indicator "Median Interview Duration (MID)", not "Average"', () => {
      expect(INDICATOR_INFO.duration.name).toContain('Median Interview Duration');
      expect(INDICATOR_INFO.duration.name.toLowerCase()).not.toContain('average');
    });
  });

  describe('Trend Analysis chart', () => {
    // Default DqaThresholdService thresholds (DqaThresholdService's own
    // settings HTTP call never resolves in these tests - it's issued via
    // HttpClientTesting but never flushed - so the service stays on its
    // built-in DEFAULT_DQA_THRESHOLDS the whole time, making tier labels
    // deterministic: RRS/ICS/ICI = Excellent(>=90 or >=80 for rrs)/Good/Critical,
    // AID = Too Short(<30min)/Normal(none)/Too Long(>60min).

    function mockTrendPoints(points: DqaTrendPoint[]) {
      const service = TestBed.inject(GeneralDqaService);
      jest.spyOn(service, 'getTrendPoints').mockReturnValue(of({ data: points, message: 'ok' } as any));
      jest.spyOn(service, 'getAnalyticsSnapshot').mockReturnValue(of({ data: null, message: 'ok' } as any));
      fixture.detectChanges();
    }

    const rrsPoints: DqaTrendPoint[] = [
      // Deliberately out of chronological order, to prove the chart sorts
      // by month rather than trusting arrival order.
      { month: '2026-02', rrs: 60,  ics: null, ici: null, aid: null },
      { month: '2026-01', rrs: 90,  ics: null, ici: null, aid: null },
      { month: '2026-01', rrs: 90,  ics: null, ici: null, aid: null },
      { month: '2026-01', rrs: 40,  ics: null, ici: null, aid: null },
    ];

    it('builds one bar dataset per fixed tier plus one line dataset, labeled "Mean" for RRS', () => {
      mockTrendPoints(rrsPoints);
      component.activeCard = 'rrs';
      component.setActiveCard('rrs');

      const labels = component.trendChartDatasets.map((d: any) => d.label);
      expect(labels).toEqual(['Excellent', 'Good', 'Critical', 'Mean']);

      const line = component.trendChartDatasets.find((d: any) => d.type === 'line');
      expect(line.borderDash).toEqual([]); // solid - matches the distribution curve's mean convention
      // Its own axis, same as every other indicator - not shared with the
      // tier-% bars, even though RRS's mean also happens to be 0-100.
      expect(line.yAxisID).toBe('y1');
    });

    it('gives the mean/median line its own right-hand axis for every indicator, pinned to 0-100 for RRS/ICS/ICI', () => {
      mockTrendPoints(rrsPoints);
      component.setActiveCard('rrs');

      const scales = component.trendChartOptions.scales as any;
      expect(scales.y1.position).toBe('right');
      expect(scales.y1.min).toBe(0);
      expect(scales.y1.max).toBe(100);
      expect(scales.y1.title.text).toBe('Mean score');
      // Not shared with the bars' axis - no gridlines drawn on top of them.
      expect(scales.y1.grid.drawOnChartArea).toBe(false);
    });

    it('sorts chart labels chronologically regardless of arrival order', () => {
      mockTrendPoints(rrsPoints);
      component.setActiveCard('rrs');
      expect(component.trendChartLabels).toEqual(['2026-01', '2026-02']);
    });

    it('computes each month\'s tier bars as a percentage of that month\'s records, not raw counts', () => {
      mockTrendPoints(rrsPoints);
      component.setActiveCard('rrs');

      // 2026-01: rrs = [90, 90, 40] -> 2 Excellent (>=80), 0 Good, 1 Critical (<50)
      // 2026-02: rrs = [60] -> 0 Excellent, 1 Good (>=50), 0 Critical
      const excellent = component.trendChartDatasets.find((d: any) => d.label === 'Excellent');
      const good       = component.trendChartDatasets.find((d: any) => d.label === 'Good');
      const critical    = component.trendChartDatasets.find((d: any) => d.label === 'Critical');

      expect(excellent.data[0]).toBeCloseTo(66.7, 1);
      expect(excellent.data[1]).toBe(0);
      expect(good.data[0]).toBe(0);
      expect(good.data[1]).toBe(100);
      expect(critical.data[0]).toBeCloseTo(33.3, 1);
      expect(critical.data[1]).toBe(0);
    });

    it('the line series is the per-month mean for RRS, rounded to 2dp', () => {
      mockTrendPoints(rrsPoints);
      component.setActiveCard('rrs');

      const line = component.trendChartDatasets.find((d: any) => d.type === 'line');
      // (90 + 90 + 40) / 3 = 73.333... -> stored/displayed as 73.33, not the
      // raw repeating decimal.
      expect(line.data[0]).toBe(73.33); // 2026-01
      expect(line.data[1]).toBe(60);    // 2026-02
    });

    it('formats the mean/median tooltip to exactly two decimal places', () => {
      mockTrendPoints(rrsPoints);
      component.setActiveCard('rrs');

      const line = component.trendChartDatasets.find((d: any) => d.type === 'line');
      const label = (component.trendChartOptions.plugins as any).tooltip.callbacks.label(
        { dataset: line, parsed: { y: line.data[0] } }
      );
      expect(label).toBe('Mean: 73.33');

      component.setActiveCard('duration');
      const durationLine = component.trendChartDatasets.find((d: any) => d.type === 'line');
      const durationLabel = (component.trendChartOptions.plugins as any).tooltip.callbacks.label(
        { dataset: durationLine, parsed: { y: 60 } }
      );
      expect(durationLabel).toBe('Median: 60.00 min'); // 2dp even for a round number
    });

    it('uses the median (not the mean) for the Duration/MID card, with its own tier set and a dashed right-axis line', () => {
      const aidPoints: DqaTrendPoint[] = [
        { month: '2026-01', rrs: null, ics: null, ici: null, aid: 10 },
        { month: '2026-01', rrs: null, ics: null, ici: null, aid: 20 },
        { month: '2026-01', rrs: null, ics: null, ici: null, aid: 90 },
      ];
      mockTrendPoints(aidPoints);
      component.setActiveCard('duration');

      const labels = component.trendChartDatasets.map((d: any) => d.label);
      expect(labels).toEqual(['Too Short', 'Normal', 'Too Long', 'Median']);

      const line = component.trendChartDatasets.find((d: any) => d.type === 'line');
      // Median of [10, 20, 90] is 20 - a mean of 40 would reveal the bug
      // this test guards against (duration must use the median, matching
      // every other part of this page - see INDICATOR_INFO.duration).
      expect(line.data[0]).toBe(20);
      expect(line.borderDash).toEqual([6, 4]); // dashed - matches the median convention
      expect(line.yAxisID).toBe('y1');          // separate axis: minutes, not 0-100

      const scales = component.trendChartOptions.scales as any;
      expect(scales.y1.min).toBeUndefined();   // auto-scaled - minutes isn't 0-100
      expect(scales.y1.max).toBeUndefined();
      expect(scales.y1.title.text).toBe('Median duration (min)');
    });

    it('switching the active card via setActiveCard recomputes the chart for the newly active indicator', () => {
      const mixedPoints: DqaTrendPoint[] = [
        { month: '2026-01', rrs: 90, ics: null, ici: null, aid: 10 },
      ];
      mockTrendPoints(mixedPoints);

      component.setActiveCard('rrs');
      expect(component.trendChartDatasets.map((d: any) => d.label)).toContain('Mean');

      component.setActiveCard('duration');
      expect(component.trendChartDatasets.map((d: any) => d.label)).toContain('Median');
      expect(component.trendChartDatasets.map((d: any) => d.label)).not.toContain('Mean');
    });

    it('excludes records with a null value for the active indicator from that month\'s computation, without crashing', () => {
      const sparsePoints: DqaTrendPoint[] = [
        { month: '2026-01', rrs: null, ics: null, ici: null, aid: null },
        { month: '2026-01', rrs: 80,   ics: null, ici: null, aid: null },
      ];
      expect(() => mockTrendPoints(sparsePoints)).not.toThrow();
      component.setActiveCard('rrs');

      const excellent = component.trendChartDatasets.find((d: any) => d.label === 'Excellent');
      expect(excellent.data[0]).toBe(100); // the 1 record with a value is Excellent -> 100%, not diluted by the null record
    });

    it('clears the chart to empty arrays when there are no trend points', () => {
      mockTrendPoints([]);
      expect(component.trendChartLabels).toEqual([]);
      expect(component.trendChartDatasets).toEqual([]);
      expect(component.hasTrendData).toBe(false);
    });

    it('hasTrendData is false while loading and on error', () => {
      fixture.detectChanges();
      expect(component.isTrendLoading).toBe(true);
      expect(component.hasTrendData).toBe(false);

      component.isTrendLoading = false;
      component.hasTrendError = true;
      expect(component.hasTrendData).toBe(false);
    });

    it('loadTrendPoints surfaces a backend error without throwing', () => {
      const service = TestBed.inject(GeneralDqaService);
      jest.spyOn(service, 'getAnalyticsSnapshot').mockReturnValue(of({ data: null, message: 'ok' } as any));
      jest.spyOn(service, 'getTrendPoints').mockReturnValue(
        new Observable(subscriber => subscriber.error('network error'))
      );

      fixture.detectChanges();

      expect(component.hasTrendError).toBe(true);
      expect(component.isTrendLoading).toBe(false);
      expect(component.hasTrendData).toBe(false);
    });
  });
});
