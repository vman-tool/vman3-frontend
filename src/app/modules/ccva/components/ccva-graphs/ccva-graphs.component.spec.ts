import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { CcvaGraphsComponent } from './ccva-graphs.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CcvaGraphsComponent', () => {
  let component: CcvaGraphsComponent;
  let fixture: ComponentFixture<CcvaGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CcvaGraphsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('CcvaGraphsComponent (unit)', () => {
  let component: CcvaGraphsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CcvaGraphsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    component = TestBed.createComponent(CcvaGraphsComponent).componentInstance;
  });

  describe('getDynamicTitle / getChartColor', () => {
    it('returns the known title for each demographic key and blank for an unknown one', () => {
      expect(component.getDynamicTitle('male')).toContain('Male Population');
      expect(component.getDynamicTitle('unknown-key')).toBe('');
    });

    it('returns the known color for each demographic key and black for an unknown one', () => {
      expect(component.getChartColor('female')).toBe('#f53794');
      expect(component.getChartColor('unknown-key')).toBe('#000000');
    });
  });

  describe('getBarColors (GBD classification)', () => {
    it('classifies communicable/maternal/neonatal causes', () => {
      expect(component.getBarColors(['Malaria', 'HIV/AIDS', 'Neonatal sepsis'])).toEqual([
        component['GBD_COLORS'].communicable,
        component['GBD_COLORS'].communicable,
        component['GBD_COLORS'].communicable,
      ]);
    });

    it('classifies injuries', () => {
      expect(component.getBarColors(['Road traffic accident', 'Drowning'])).toEqual([
        component['GBD_COLORS'].injury,
        component['GBD_COLORS'].injury,
      ]);
    });

    it('classifies undetermined causes', () => {
      expect(component.getBarColors(['Undetermined cause'])).toEqual([
        component['GBD_COLORS'].undetermined,
      ]);
    });

    it('falls back to NCD for anything else', () => {
      expect(component.getBarColors(['Diabetes mellitus'])).toEqual([component['GBD_COLORS'].ncd]);
    });
  });

  describe('loadChartData / filterGraphData / renderChart', () => {
    const graphs = {
      all: { index: ['Malaria', 'Diabetes', 'Road traffic accident'], values: [10, 20, 5] },
      male: { index: [], values: [] }, // empty subgroup - must be skipped, not crash
    };

    it('renders a chart per non-empty group, keyed by group name', () => {
      component.loadChartData({ graphs });

      expect(component.chartKeys).toEqual(['all']);
      expect(component.charts['all'].labels).toEqual(['Malaria', 'Diabetes', 'Road traffic accident']);
      expect(component.charts['all'].datasets[0].data).toEqual([10, 20, 5]);
      expect(component.isLoading).toBe(false);
    });

    it('limits the rendered points to sliderValue, keeping the first N', () => {
      component.sliderValue = 2;
      component.loadChartData({ graphs });

      expect(component.charts['all'].labels).toEqual(['Malaria', 'Diabetes']);
      expect(component.charts['all'].datasets[0].data).toEqual([10, 20]);
    });

    it('always shows at least 1 point even when sliderValue is 0', () => {
      component.sliderValue = 0;
      component.loadChartData({ graphs });

      expect(component.charts['all'].labels).toEqual(['Malaria']);
    });

    it('toggleGroup excludes that GBD group from the rendered chart without touching the stored original data', () => {
      component.sliderValue = 10;
      component.loadChartData({ graphs });

      component.toggleGroup('injury');

      expect(component.includeGroup['injury']).toBe(false);
      expect(component.charts['all'].labels).toEqual(['Malaria', 'Diabetes']);
      // The full, untouched CSMF is preserved so re-toggling never loses data.
      expect(component['originalChartData']['all'].labels).toEqual([
        'Malaria', 'Diabetes', 'Road traffic accident',
      ]);

      component.toggleGroup('injury');
      expect(component.charts['all'].labels).toEqual(['Malaria', 'Diabetes', 'Road traffic accident']);
    });
  });
});
