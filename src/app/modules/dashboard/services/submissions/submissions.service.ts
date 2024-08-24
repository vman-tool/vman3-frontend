import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ErrorEmitters } from '../../../../core/emitters/error.emitters';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { SubmissionsDataModel } from '../../interface';
import { ConfigService } from 'app/app.service';
const EXCEL_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';
@Injectable({
  providedIn: 'root',
})
export class SubmissionsService {
  error?: string;
  success?: boolean;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
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
    startDate?: string,
    endDate?: string,
    locations?: string[]
  ): Observable<any> {
    let params = new HttpParams()
      .set('page_number', page.toString())
      .set('limit', limit.toString());

    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', locations.join(','));
    }
    return this.http
      .get<any>(`${this.configService.API_URL}/statistics/submissions`, { params })
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
}
