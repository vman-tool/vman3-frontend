import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GraphsComponent } from './graphs.component';
import { GeneralDqaService } from '../../../data-quality/services/general-dqa.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('GraphsComponent', () => {
  let component: GraphsComponent;
  let fixture: ComponentFixture<GraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GraphsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Median Interview Duration (dqaDuration)', () => {
    // Regression test: this KPI card used to read .avg (the mean), which is
    // misleading for a right-skewed duration distribution - it must read
    // .p50 (the median) instead, matching the card's "Median Interview
    // Duration" label and the vman_dq manuscript's own MID definition.
    it('reads the median (p50), not the mean (avg), for both the value and its tier', () => {
      const service = TestBed.inject(GeneralDqaService);
      jest.spyOn(service, 'getAnalyticsSnapshot').mockReturnValue(of({
        data: {
          status: 'completed',
          computed_at: '2026-01-01T00:00:00Z',
          rrs: null,
          ics: null,
          ici: null,
          aid: {
            overall: { avg: 90, min_v: 1, max_v: 400, stddev: 50, p50: 35, count: 100 },
            by_age_group: {
              adults: { avg: 0, min_v: 0, max_v: 0, stddev: 0, p50: 0, count: 0 },
              children: { avg: 0, min_v: 0, max_v: 0, stddev: 0, p50: 0, count: 0 },
              neonates: { avg: 0, min_v: 0, max_v: 0, stddev: 0, p50: 0, count: 0 },
            },
            by_gender_adult: {
              male_adults: { avg: 0, min_v: 0, max_v: 0, stddev: 0, p50: 0, count: 0 },
              female_adults: { avg: 0, min_v: 0, max_v: 0, stddev: 0, p50: 0, count: 0 },
            },
          },
        },
      } as any));

      component.ngOnInit();

      // avg=90min would render "1h 30m" - the component must show the
      // p50=35min figure instead.
      expect(component.dqaDuration).toBe('35 min');
      expect(component.dqaDuration).not.toBe('1h 30m');
    });
  });

  describe('processBarChartData', () => {
    const submissions = [
      { month: 1, year: 2024, count: 10 },
      { month: 2, year: 2024, count: 20 },
    ];

    it('builds one bar dataset per year with no target line when monthlyTarget is not given', () => {
      component.processBarChartData(submissions);
      expect(component.barChartData.length).toBe(1);
      expect(component.barChartData[0].label).toBe('2024');
      expect(component.barChartData[0].data[0]).toBe(10);
      expect(component.barChartData[0].data[1]).toBe(20);
      expect(component.barChartData.some((d: any) => d.type === 'line')).toBe(false);
    });

    it('appends a flat 12-month line dataset when monthlyTarget is provided', () => {
      component.processBarChartData(submissions, 100);
      const target = component.barChartData.find((d: any) => d.type === 'line');
      expect(target).toBeTruthy();
      expect(target.label).toBe('Target');
      expect(target.data).toEqual(new Array(12).fill(100));
    });

    it('omits the target line when monthlyTarget is null', () => {
      component.processBarChartData(submissions, null);
      expect(component.barChartData.some((d: any) => d.type === 'line')).toBe(false);
    });

    it('gives every bar dataset its own explicit color, distinct per year', () => {
      // Regression: once the Target line dataset sets its own borderColor,
      // Chart.js's built-in `colors` auto-coloring plugin stops colorizing
      // the whole chart (it only auto-colors when no dataset has a color),
      // so every bar dataset must set its own color too or they all render
      // in the same default gray.
      const multiYearSubmissions = [
        { month: 1, year: 2023, count: 5 },
        { month: 1, year: 2024, count: 10 },
      ];
      component.processBarChartData(multiYearSubmissions, 50);
      const barDatasets = component.barChartData.filter((d: any) => d.type !== 'line');
      expect(barDatasets.length).toBe(2);
      barDatasets.forEach((d: any) => {
        expect(d.backgroundColor).toBeTruthy();
        expect(d.borderColor).toBeTruthy();
      });
      expect(barDatasets[0].backgroundColor).not.toBe(barDatasets[1].backgroundColor);
    });
  });
});
