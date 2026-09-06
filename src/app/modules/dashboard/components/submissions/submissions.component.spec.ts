import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SubmissionsComponent } from './submissions.component';
import { SubmissionsService } from '../../services/submissions/submissions.service';
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

  describe('period filter', () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = () => {
      const now = new Date();
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    };

    it('defaults to all', () => {
      expect(component.periodFilter).toBe('all');
    });

    it('sends no date override to the request when set to all', () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'getsubmissionsData').mockReturnValue(of({ data: [], total: 0 }));
      component.filterData.start_date = undefined;
      component.filterData.end_date = undefined;
      component.loadRecords();
      const args = spy.mock.calls[spy.mock.calls.length - 1];
      expect(args[2]).toBeUndefined();
      expect(args[3]).toBeUndefined();
    });

    it('uses today as both start and end date for "today"', () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'getsubmissionsData').mockReturnValue(of({ data: [], total: 0 }));
      component.onPeriodFilterChange('today');
      const args = spy.mock.calls[spy.mock.calls.length - 1];
      expect(args[2]).toBe(todayStr());
      expect(args[3]).toBe(todayStr());
    });

    it('uses the first of the current month as the start date for "month"', () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'getsubmissionsData').mockReturnValue(of({ data: [], total: 0 }));
      component.onPeriodFilterChange('month');
      const args = spy.mock.calls[spy.mock.calls.length - 1];
      const now = new Date();
      expect(args[2]).toBe(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      expect(args[3]).toBe(todayStr());
    });

    it('uses January 1st of the current year as the start date for "year"', () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'getsubmissionsData').mockReturnValue(of({ data: [], total: 0 }));
      component.onPeriodFilterChange('year');
      const args = spy.mock.calls[spy.mock.calls.length - 1];
      const now = new Date();
      expect(args[2]).toBe(`${now.getFullYear()}-01-01`);
    });

    it('does nothing when re-selecting the currently active period', () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'getsubmissionsData').mockReturnValue(of({ data: [], total: 0 }));
      component.periodFilter = 'month';
      spy.mockClear();
      component.onPeriodFilterChange('month');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('download menu', () => {
    it('toggles open and closed', () => {
      component.downloadMenuOpen = false;
      component.toggleDownloadMenu();
      expect(component.downloadMenuOpen).toBe(true);
      component.toggleDownloadMenu();
      expect(component.downloadMenuOpen).toBe(false);
    });

    it('closes on a click outside the menu wrapper', () => {
      component.downloadMenuOpen = true;
      const outsideEl = document.createElement('div');
      const event = { composedPath: () => [outsideEl] } as unknown as MouseEvent;
      component.onDocumentClickForDownloadMenu(event);
      expect(component.downloadMenuOpen).toBe(false);
    });

    it('stays open on a click inside the menu wrapper', () => {
      component.downloadMenuOpen = true;
      const insideEl = document.createElement('div');
      insideEl.classList.add('download-menu-wrapper');
      const event = { composedPath: () => [insideEl] } as unknown as MouseEvent;
      component.onDocumentClickForDownloadMenu(event);
      expect(component.downloadMenuOpen).toBe(true);
    });

    it('is a no-op when the menu is already closed', () => {
      component.downloadMenuOpen = false;
      const event = { composedPath: () => [] } as unknown as MouseEvent;
      component.onDocumentClickForDownloadMenu(event);
      expect(component.downloadMenuOpen).toBe(false);
    });
  });

  describe('onDownload', () => {
    it('exports Excel via the service using the currently sorted data, and closes the menu', async () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'exportToExcel').mockImplementation(() => {});
      component.downloadMenuOpen = true;
      component.dataSubmissions = [];
      await component.onDownload('xlsx');
      expect(spy).toHaveBeenCalledWith(component.sortedData, 'VA_Submissions');
      expect(component.downloadMenuOpen).toBe(false);
    });

    it('exports an image via the service using the table element ref', async () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'exportToImage').mockResolvedValue();
      const fakeTable = document.createElement('table');
      component.summaryTableRef = { nativeElement: fakeTable } as any;
      await component.onDownload('image');
      expect(spy).toHaveBeenCalledWith(fakeTable, 'VA_Submissions');
      expect(component.isExporting).toBe(false);
    });

    it('exports a PDF via the service using the table element ref', async () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'exportToPdf').mockResolvedValue();
      const fakeTable = document.createElement('table');
      component.summaryTableRef = { nativeElement: fakeTable } as any;
      await component.onDownload('pdf');
      expect(spy).toHaveBeenCalledWith(fakeTable, 'VA_Submissions');
    });

    it('does nothing for image/pdf when the table element ref is unavailable', async () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'exportToImage').mockResolvedValue();
      component.summaryTableRef = undefined;
      await component.onDownload('image');
      expect(spy).not.toHaveBeenCalled();
    });

    it('ignores a call while an export is already in progress', async () => {
      const service = TestBed.inject(SubmissionsService);
      const spy = jest.spyOn(service, 'exportToImage').mockResolvedValue();
      component.isExporting = true;
      await component.onDownload('image');
      expect(spy).not.toHaveBeenCalled();
    });

    it('resets isExporting when the export throws', async () => {
      const service = TestBed.inject(SubmissionsService);
      jest.spyOn(service, 'exportToImage').mockRejectedValue(new Error('boom'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const fakeTable = document.createElement('table');
      component.summaryTableRef = { nativeElement: fakeTable } as any;
      await component.onDownload('image');
      expect(component.isExporting).toBe(false);
    });
  });
});
