import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SubmissionsService } from './submissions.service';

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('jspdf', () => ({
  jsPDF: jest.fn(),
}));

import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SubmissionsService);
    jest.clearAllMocks();
  });

  function fakeCanvas(width = 1000, height = 500) {
    return {
      width,
      height,
      toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['x'])),
      toDataURL: jest.fn(() => 'data:image/jpeg;base64,xyz'),
    } as unknown as HTMLCanvasElement;
  }

  describe('exportToExcel', () => {
    it('writes an .xlsx file via FileSaver with the given filename', () => {
      const saveSpy = saveAs as unknown as jest.Mock;
      service.exportToExcel([{ region: 'Dodoma' } as any], 'VA_Submissions');
      expect(saveSpy).toHaveBeenCalledWith(expect.any(Blob), 'VA_Submissions.xlsx');
    });
  });

  describe('exportToImage (via captureTableCanvas)', () => {
    it('renders an off-screen clone with sticky/truncate/overflow-hidden/whitespace-nowrap classes stripped, not the live element', async () => {
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.classList.add('sticky', 'top-0');
      const th = document.createElement('th');
      th.classList.add('overflow-hidden');
      const label = document.createElement('span');
      label.classList.add('truncate');
      th.appendChild(label);
      thead.appendChild(th);
      table.appendChild(thead);
      const td = document.createElement('td');
      td.classList.add('whitespace-nowrap');
      table.appendChild(td);
      Object.defineProperty(table, 'offsetWidth', { value: 800, configurable: true });
      document.body.appendChild(table);

      let capturedEl: HTMLElement | undefined;
      (html2canvas as jest.Mock).mockImplementation(async (el: HTMLElement) => {
        capturedEl = el;
        expect(document.body.contains(el)).toBe(true);
        expect(el.querySelector('.sticky')).toBeNull();
        expect(el.querySelector('.truncate')).toBeNull();
        expect(el.querySelector('.overflow-hidden')).toBeNull();
        expect(el.querySelector('.whitespace-nowrap')).toBeNull();
        return fakeCanvas();
      });

      const saveSpy = saveAs as unknown as jest.Mock;
      await service.exportToImage(table, 'VA_Submissions');

      expect(html2canvas).toHaveBeenCalled();
      expect(capturedEl).not.toBe(table);
      expect(capturedEl?.tagName).toBe('TABLE');
      // The temporary off-screen wrapper is removed again afterwards.
      expect(document.body.contains(capturedEl!.parentElement)).toBe(false);
      expect(saveSpy).toHaveBeenCalledWith(expect.any(Blob), 'VA_Submissions.png');

      document.body.removeChild(table);
    });

    it('removes the off-screen wrapper even when html2canvas throws', async () => {
      const table = document.createElement('table');
      document.body.appendChild(table);
      (html2canvas as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(service.exportToImage(table, 'x')).rejects.toThrow('boom');

      const leftoverWrappers = Array.from(document.body.children).filter(
        (el) => (el as HTMLElement).style.position === 'fixed'
      );
      expect(leftoverWrappers.length).toBe(0);

      document.body.removeChild(table);
    });

    it('rejects when the canvas cannot be converted to a blob', async () => {
      const table = document.createElement('table');
      document.body.appendChild(table);
      (html2canvas as jest.Mock).mockResolvedValue({
        ...fakeCanvas(),
        toBlob: (cb: (b: Blob | null) => void) => cb(null),
      });

      await expect(service.exportToImage(table, 'x')).rejects.toThrow(
        'Failed to render table to an image.'
      );

      document.body.removeChild(table);
    });
  });

  describe('exportToPdf', () => {
    it('embeds a JPEG (not PNG) and picks landscape for a wide table', async () => {
      const table = document.createElement('table');
      document.body.appendChild(table);
      const canvas = fakeCanvas(2000, 500); // wide
      (html2canvas as jest.Mock).mockResolvedValue(canvas);

      const addImage = jest.fn();
      const save = jest.fn();
      const pdfInstance = { internal: { pageSize: { getWidth: () => 595 } }, addImage, save };
      (jsPDF as unknown as jest.Mock).mockImplementation(() => pdfInstance);

      await service.exportToPdf(table, 'VA_Submissions');

      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.92);
      expect(jsPDF).toHaveBeenCalledWith(
        expect.objectContaining({ orientation: 'l', format: 'a4' })
      );
      expect(addImage).toHaveBeenCalledWith(
        'data:image/jpeg;base64,xyz', 'JPEG', 0, 0, 595, expect.any(Number)
      );
      expect(save).toHaveBeenCalledWith('VA_Submissions.pdf');

      document.body.removeChild(table);
    });

    it('picks portrait for a tall/narrow table', async () => {
      const table = document.createElement('table');
      document.body.appendChild(table);
      (html2canvas as jest.Mock).mockResolvedValue(fakeCanvas(400, 1200)); // tall

      const pdfInstance = { internal: { pageSize: { getWidth: () => 595 } }, addImage: jest.fn(), save: jest.fn() };
      (jsPDF as unknown as jest.Mock).mockImplementation(() => pdfInstance);

      await service.exportToPdf(table, 'x');

      expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({ orientation: 'p' }));

      document.body.removeChild(table);
    });
  });
});
