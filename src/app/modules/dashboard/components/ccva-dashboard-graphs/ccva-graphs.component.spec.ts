import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaDashboardGraphsComponent } from './ccva-graphs.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CcvaDashboardGraphsComponent', () => {
  let component: CcvaDashboardGraphsComponent;
  let fixture: ComponentFixture<CcvaDashboardGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CcvaDashboardGraphsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaDashboardGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('chartTitle / getChartSubtitle', () => {
    it('uses the same title for every chart, with only the subtitle differing per demographic key', () => {
      expect(component.chartTitle).toBe('Distribution of Causes of Death');
      expect(component.getChartSubtitle('adult')).toBe('Adult Population');
      expect(component.getChartSubtitle('child')).toBe('Child Population');
      expect(component.getChartSubtitle('neonate')).toBe('Neonate Population');
      expect(component.getChartSubtitle('male')).toBe('Male');
      expect(component.getChartSubtitle('female')).toBe('Female');
      expect(component.getChartSubtitle('all')).toBe('All');
      expect(component.getChartSubtitle('unknown-key')).toBe('');
    });
  });

  describe('loadChartData', () => {
    const graphFor = (n: number) => ({ index: ['A', 'B'], values: [n, n] });

    it('renders every chart in graphs and orders chartKeys gender-first, then age-group', () => {
      component.loadChartData({
        graphs: {
          neonate: graphFor(1),
          all: graphFor(2),
          child: graphFor(3),
          female: graphFor(4),
          adult: graphFor(5),
          male: graphFor(6),
        },
      });

      expect(component.chartKeys).toEqual(['all', 'male', 'female', 'adult', 'child', 'neonate']);
      expect(Object.keys(component.charts).sort()).toEqual(
        ['adult', 'all', 'child', 'female', 'male', 'neonate']
      );
    });

    it('omits a key with no data from chartKeys, without erroring', () => {
      component.loadChartData({
        graphs: { all: graphFor(1), male: graphFor(2) },
      });

      expect(component.chartKeys).toEqual(['all', 'male']);
    });

    it('handles an empty graphs object', () => {
      component.loadChartData({ graphs: {} });
      expect(component.chartKeys).toEqual([]);
    });
  });

  describe('trackByKey', () => {
    it('returns the key itself, so *ngFor identity is stable across reference-different but equal chartKeys arrays', () => {
      expect(component.trackByKey(0, 'male')).toBe('male');
    });
  });
});
