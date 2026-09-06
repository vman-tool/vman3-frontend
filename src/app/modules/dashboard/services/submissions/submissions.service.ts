import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ErrorEmitters } from '../../../../core/emitters/error.emitters';
import * as XLSX from '@e965/xlsx';
import * as FileSaver from 'file-saver';
import { SubmissionsDataModel } from '../../interface';
import { ConfigService } from 'app/app.service';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';
const EXCEL_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';
@Injectable({
  providedIn: 'root',
})
export class SubmissionsService {
  error?: string;
  success?: boolean;

  constructor(private http: HttpClient, private configService: ConfigService) {
    ErrorEmitters.errorEmitter.subscribe((error: any) => {
      this.error = error;
    });
    ErrorEmitters.successEmitter.subscribe(() => {
      this.success = true;
    });
  }

  getsubmissionsData(
    page: number = 1,
    limit: number = 10,
    start_date?: string,
    end_date?: string,
    locations?: LocationSelection[],
    date_type?: string,
    group_level?: number
  ): Observable<any> {
    let params = new HttpParams()
      .set('page_number', page.toString())
      .set('limit', limit.toString());

    if (start_date) {
      params = params.set('start_date', start_date);
    }
    if (end_date) {
      params = params.set('end_date', end_date);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', JSON.stringify(locations.map(l => ({ field: l.field, value: l.value }))));
    }
    if (date_type) {
      params = params.set('date_type', date_type);
    }
    if (group_level) {
      params = params.set('group_level', group_level.toString());
    }
    return this.http
      .get<any>(`${this.configService.API_URL}/statistics/submissions`, {
        params,
      })
      .pipe(
        map((response: any) => response),
        catchError((error: any) => {
          console.log('Error: ', error);
          return of({
            data: [],
            message: 'Failed to fetch submissions',
            error: error.message,
            total: 0,
          });
        })
      );
  }
  exportToExcel(data: SubmissionsDataModel[], fileName: string): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = {
      Sheets: { data: worksheet },
      SheetNames: ['data'],
    };
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    this.saveAsExcelFile(excelBuffer, fileName);
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    FileSaver.saveAs(data, fileName + EXCEL_EXTENSION);
  }

  // html2canvas/jsPDF are dynamically imported rather than imported at the
  // top of this file - they're only ever needed if someone actually picks
  // "Image" or "PDF" from the download menu, so keeping them out of the
  // static import graph keeps them out of the initial bundle entirely
  // (they load as their own lazy chunk on first use instead).

  // The live table's <thead>/<tfoot> are `sticky` so they stay visible while
  // the body scrolls - but html2canvas paints a `position: sticky` element
  // at whatever screen position it currently occupies rather than its
  // static in-flow position, so capturing the live element directly leaves
  // the Total row floating wherever the table happened to be scrolled to,
  // instead of at the bottom. Cloning the table off-screen with `sticky`
  // stripped renders it as a plain top-to-bottom document instead, with no
  // visible disruption to the actual on-screen table.
  //
  // `.truncate` (and the plain `overflow-hidden` used the same way on a
  // flex child) is also stripped: combined with a flex `min-w-0` sibling,
  // html2canvas has a known rendering bug where it clips a sliver off the
  // *top* of that cell's text rather than truncating it horizontally as the
  // browser does. There's no fixed column width to truncate against in an
  // export anyway, so letting the full label show is strictly better here.
  // `.whitespace-nowrap` is stripped alongside it for the same reason - on
  // its own it would keep a long label on one line and let it visually
  // overflow into the next cell rather than truncating, now that overflow
  // is no longer hidden; removing it lets a long name wrap instead.
  private async captureTableCanvas(tableEl: HTMLElement) {
    const html2canvas = (await import('html2canvas')).default;
    const clone = tableEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.sticky').forEach(el => el.classList.remove('sticky'));
    clone.querySelectorAll('.truncate').forEach(el => el.classList.remove('truncate'));
    clone.querySelectorAll('.overflow-hidden').forEach(el => el.classList.remove('overflow-hidden'));
    clone.querySelectorAll('.whitespace-nowrap').forEach(el => el.classList.remove('whitespace-nowrap'));

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '-99999px';
    wrapper.style.width = `${tableEl.offsetWidth}px`;
    wrapper.style.background = '#ffffff';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      return await html2canvas(clone, { backgroundColor: '#ffffff', scale: 2 });
    } finally {
      document.body.removeChild(wrapper);
    }
  }

  async exportToImage(element: HTMLElement, fileName: string): Promise<void> {
    const canvas = await this.captureTableCanvas(element);
    await new Promise<void>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Failed to render table to an image.'));
          return;
        }
        FileSaver.saveAs(blob, `${fileName}.png`);
        resolve();
      });
    });
  }

  async exportToPdf(element: HTMLElement, fileName: string): Promise<void> {
    const [canvas, { jsPDF }] = await Promise.all([
      this.captureTableCanvas(element),
      import('jspdf'),
    ]);
    // JPEG rather than PNG here - a large table at 2x scale can be 15-20MB
    // as a lossless PNG; a table screenshot (mostly flat white with text)
    // compresses to a small fraction of that as JPEG with no visible loss.
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    // A wide table reads better landscape; a tall/narrow one portrait.
    const orientation = canvas.width >= canvas.height ? 'l' : 'p';
    const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight);
    pdf.save(`${fileName}.pdf`);
  }
}
