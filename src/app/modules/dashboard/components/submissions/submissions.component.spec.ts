import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmissionsComponent } from './submissions.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('SubmissionsComponent', () => {
  let component: SubmissionsComponent;
  let fixture: ComponentFixture<SubmissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SubmissionsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('formatDate', () => {
    it('keeps a bare YYYY-MM-DD unchanged', () => {
      expect(component.formatDate('2024-03-05')).toBe('2024-03-05');
    });

    it('truncates a full ISO datetime to its date portion', () => {
      expect(component.formatDate('2024-03-05T08:30:00Z')).toBe('2024-03-05');
    });

    it('returns an empty string for a missing value', () => {
      expect(component.formatDate(undefined)).toBe('');
      expect(component.formatDate(null)).toBe('');
    });
  });

  describe('getTotalExpected / getTotalCompleteness', () => {
    const row = (count: number, expected: number | null) => ({
      totalSubmitedToday: 0,
      region: 'Dodoma',
      count,
      firstSubmission: '2024-01-01',
      lastSubmission: '2024-12-31',
      expected,
      completeness: expected ? Math.round((count / expected) * 10000) / 100 : null,
      coverage: 12,
      adults: count,
      children: 0,
      neonates: 0,
      male: 0,
      female: 0,
    });

    it('sums expected across rows that have it, ignoring unmapped rows', () => {
      component.dataSubmissions = [row(60, 1200), row(10, null)];
      expect(component.getTotalExpected()).toBe(1200);
    });

    it('returns null when no row has an expected value', () => {
      component.dataSubmissions = [row(10, null), row(20, null)];
      expect(component.getTotalExpected()).toBeNull();
    });

    it('computes overall completeness as total submitted over total expected', () => {
      component.dataSubmissions = [row(60, 1200), row(40, 800)];
      // total submitted 100 / total expected 2000 * 100 = 5%
      expect(component.getTotalCompleteness()).toBe(5);
    });

    it('returns null completeness when total expected is null or zero', () => {
      component.dataSubmissions = [row(10, null)];
      expect(component.getTotalCompleteness()).toBeNull();
    });

    it('rounds a fractional expected total to a whole number', () => {
      component.dataSubmissions = [row(1, 100), row(1, 50.6)];
      expect(component.getTotalExpected()).toBe(151);
    });

    it('rounds completeness to two decimal places', () => {
      component.dataSubmissions = [row(1, 3)];
      // 1 / 3 * 100 = 33.333...
      expect(component.getTotalCompleteness()).toBe(33.33);
    });
  });

  describe('totalColumns', () => {
    it('is 11 fixed columns plus one per admin level shown', () => {
      component.groupLevel = 1;
      expect(component.totalColumns).toBe(12);
      component.groupLevel = 2;
      expect(component.totalColumns).toBe(13);
      component.groupLevel = 3;
      expect(component.totalColumns).toBe(14);
    });
  });
});
