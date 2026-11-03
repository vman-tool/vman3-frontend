import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GraphsComponent } from './graphs.component';
import { GeneralDqaService } from '../../../data-quality/services/general-dqa.service';
import { SettingConfigService } from '../../../settings/services/settings_configs.service';
import { ChartsService } from '../../services/charts/charts.service';
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

  describe('Geographic Coverage labels (adminLevel1LabelPlural / adminLevel2LabelPlural)', () => {
    // Regression test: these used to be hardcoded "Regions"/"Districts" in
    // the template, which doesn't hold for every country this app is
    // deployed in - they must reflect this deployment's own configured
    // admin-level names instead.
    it('defaults to generic admin-level wording before the config loads', () => {
      expect(component.adminLevel1LabelPlural).toBe('Admin Level 1s');
      expect(component.adminLevel2LabelPlural).toBe('Admin Level 2s');
    });

    it('uses this deployment\'s configured admin-level labels, pluralized, once loaded', () => {
      const service = TestBed.inject(SettingConfigService);
      jest.spyOn(service, 'getSettingsConfig').mockReturnValue(of({
        system_configs: { admin_level1: 'Province', admin_level2: 'District' },
      } as any));

      component.loadAdminLevelLabels();

      expect(component.adminLevel1LabelPlural).toBe('Provinces');
      expect(component.adminLevel2LabelPlural).toBe('Districts');
    });

    it('does not double an already-plural-looking label', () => {
      const service = TestBed.inject(SettingConfigService);
      jest.spyOn(service, 'getSettingsConfig').mockReturnValue(of({
        system_configs: { admin_level1: 'Districts', admin_level2: 'Region' },
      } as any));

      component.loadAdminLevelLabels();

      expect(component.adminLevel1LabelPlural).toBe('Districts');
      expect(component.adminLevel2LabelPlural).toBe('Regions');
    });

    it('keeps the previous label when a level is not configured for this deployment', () => {
      const service = TestBed.inject(SettingConfigService);
      jest.spyOn(service, 'getSettingsConfig').mockReturnValue(of({
        system_configs: { admin_level1: '', admin_level2: 'District' },
      } as any));

      component.loadAdminLevelLabels();

      expect(component.adminLevel1LabelPlural).toBe('Admin Level 1s');
      expect(component.adminLevel2LabelPlural).toBe('Districts');
    });
  });

  describe('consentPercentage', () => {
    it('shows "—" before dataOverview has loaded', () => {
      component.dataOverview = null;
      expect(component.consentPercentage).toBe('—');
    });

    it('formats as "consented/total, pct%"', () => {
      component.dataOverview = {
        total: 20, first_submission: null, last_submission: null,
        distinct_regions: 0, distinct_districts: 0, consented: 10,
      };
      expect(component.consentPercentage).toBe('50% (10/20)');
    });

    it('rounds the percentage to the nearest whole number', () => {
      component.dataOverview = {
        total: 4417, first_submission: null, last_submission: null,
        distinct_regions: 0, distinct_districts: 0, consented: 4240,
      };
      expect(component.consentPercentage).toBe('96% (4,240/4,417)');
    });

    it('treats a missing total as "—" rather than dividing by zero', () => {
      component.dataOverview = {
        total: 0, first_submission: null, last_submission: null,
        distinct_regions: 0, distinct_districts: 0, consented: 0,
      };
      expect(component.consentPercentage).toBe('—');
    });
  });

  describe('Monthly Submissions view toggle (submission date vs. date of death)', () => {
    // Regression: the "Monthly Submissions" card used to always group by
    // whatever the global Date Type filter happened to be set to. It must
    // now have its own independent control, defaulting to submission date,
    // that re-queries just this chart without touching the rest of the
    // dashboard (age/gender distribution, dataset overview).
    it('defaults to grouping by submission date', () => {
      expect(component.monthlySubmissionsViewMode).toBe('submission_date');
    });

    it('re-fetches with date_type=death_date and redraws the chart when switched to "Date of Death"', () => {
      const service = TestBed.inject(ChartsService);
      const spy = jest.spyOn(service, 'getChartfetchStatistics').mockReturnValue(of({
        data: {
          monthly_submissions: [{ month: 3, year: 1945, count: 7 }],
          monthly_target: null,
        },
      }));

      component.onMonthlySubmissionsViewChange('death_date');

      expect(component.monthlySubmissionsViewMode).toBe('death_date');
      expect(spy).toHaveBeenCalledWith(
        component.filterData.start_date,
        component.filterData.end_date,
        component.filterData.locations,
        'death_date'
      );
      expect(component.barChartData[0].data[2]).toBe(7); // March (index 2)
    });

    it('omits "Date of Death" from the options when death_date is not mapped for this deployment', () => {
      const service = TestBed.inject(SettingConfigService);
      jest.spyOn(service, 'getSettingsConfig').mockReturnValue(of({
        system_configs: { admin_level1: 'Region', admin_level2: 'District' },
        field_mapping: { death_date: null },
      } as any));

      component.loadAdminLevelLabels();

      expect(component.monthlySubmissionsViewOptions.map(o => o.value)).not.toContain('death_date');
    });
  });

  describe('processBarChartData - many distinct years', () => {
    // Regression: a date field with a wide historical spread (e.g. date of
    // death) used to put one colored bar dataset per distinct year inside
    // 12 fixed month slots - with dozens of years, each bar became a
    // near-invisible sliver instead of a readable vertical bar.
    function manyYearsOfData(): { month: number; year: number; count: number }[] {
      const rows = [];
      for (let y = 1918; y <= 1983; y += 5) {
        rows.push({ month: (y % 12) + 1, year: y, count: y % 50 });
      }
      return rows; // 14 distinct years > the 8-color palette
    }

    it('falls back to a single chronological series instead of one dataset per year', () => {
      component.processBarChartData(manyYearsOfData() as any, null);

      expect(component.barChartData.length).toBe(1);
      expect(component.barChartData[0].data.length).toBe(manyYearsOfData().length);
      expect(component.barChartLabels[0]).toMatch(/^\w{3} 1918$/);
    });

    it('still uses one dataset per year, with fixed Jan-Dec labels, when years are few', () => {
      const rows = [
        { month: 1, year: 2024, count: 3 },
        { month: 2, year: 2025, count: 4 },
      ];

      component.processBarChartData(rows as any, null);

      expect(component.barChartData.length).toBe(2);
      expect(component.barChartLabels).toEqual([
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ]);
    });
  });
});
