import { TestBed } from '@angular/core/testing';

import { CsvExportService } from './csv-export.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CsvExportService', () => {
  let service: CsvExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CsvExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('CsvExportService (unit)', () => {
  let service: CsvExportService;
  let capturedBlob: Blob | undefined;

  beforeEach(() => {
    service = new CsvExportService();
    capturedBlob = undefined;
    // jsdom has no URL.createObjectURL - capture the Blob it would have
    // received so the CSV text itself can still be asserted on.
    (URL as any).createObjectURL = jest.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:fake-url';
    });
    (URL as any).revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  function exportedCsvText(data: any[], filename = 'export.csv', headers?: string[]): Promise<string> {
    service.exportToCSV(data, filename, headers);
    // jsdom's Blob has no .text(); FileReader is implemented, so use that.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(capturedBlob!);
    });
  }

  it('derives headers from the first row when none are given', async () => {
    const text = await exportedCsvText([{ id: 1, name: 'North' }, { id: 2, name: 'South' }]);
    expect(text).toBe('id,name\n1,North\n2,South\n');
  });

  it('uses the given headers, in order, over the row keys', async () => {
    const text = await exportedCsvText([{ id: 1, name: 'North' }], 'export.csv', ['name', 'id']);
    expect(text).toBe('name,id\nNorth,1\n');
  });

  it('renders null/undefined cells as empty', async () => {
    const text = await exportedCsvText([{ id: 1, name: null, note: undefined }], 'export.csv', ['id', 'name', 'note']);
    expect(text).toBe('id,name,note\n1,,\n');
  });

  it('quotes a cell containing a comma, and escapes embedded quotes', async () => {
    const text = await exportedCsvText([{ id: 1, name: 'North, "the good one"' }]);
    expect(text).toBe('id,name\n1,"North, ""the good one"""\n');
  });

  it('quotes a cell containing a newline', async () => {
    const text = await exportedCsvText([{ id: 1, note: 'line one\nline two' }], 'export.csv', ['id', 'note']);
    expect(text).toBe('id,note\n1,"line one\nline two"\n');
  });

  it('triggers a download with the given filename', async () => {
    const link = document.createElement('a');
    jest.spyOn(document, 'createElement').mockReturnValue(link);
    const clickSpy = jest.spyOn(link, 'click');

    service.exportToCSV([{ id: 1 }], 'records.csv');

    expect(link.download).toBe('records.csv');
    expect(clickSpy).toHaveBeenCalled();
    (document.createElement as jest.Mock).mockRestore();
  });
});
