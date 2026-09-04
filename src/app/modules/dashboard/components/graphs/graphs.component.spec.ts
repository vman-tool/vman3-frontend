import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphsComponent } from './graphs.component';
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
