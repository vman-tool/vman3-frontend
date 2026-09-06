import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as XLSX from '@e965/xlsx';
import * as FileSaver from 'file-saver';
import { ConfigService } from '../../../app.service';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';

const EXCEL_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

@Injectable({
  providedIn: 'root',
})
export class CcvaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}
  get_ccva_by_id(
    ccvaId: string,
    selected_success_type: string | null = null,
    start_date?: string,
    end_date?: string,
    locations?: LocationSelection[],
    date_type?: string,
    ccva_graph_db_source: boolean = true
  ) {
    let params = new HttpParams();
    if (selected_success_type) {
      params = params.set('selected_success_type', selected_success_type);
    }
    params = params.set('ccva_graph_db_source', ccva_graph_db_source);
    if (start_date) {
      params = params.set('start_date', start_date);
    }
    if (end_date) {
      params = params.set('end_date', end_date);
    }
    if (date_type) {
      params = params.set('date_type', date_type);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', JSON.stringify(locations.map(l => ({ field: l.field, value: l.value }))));
    }
    return this.http.get(
      `${this.configService.API_URL}/ccva?ccva_id=${ccvaId}`,
      {
        params,
      }
    );
  }
  // Get all CCVA results
  get_ccva_Results(
    ccvaId?: string,
    selected_success_type: string | null = null,
    start_date?: string,
    end_date?: string,
    locations?: LocationSelection[],
    date_type?: string,
    ccva_graph_db_source: boolean = true
  ) {
    let pathUrl = `${this.configService.API_URL}/ccva`;
    let params = new HttpParams();
    if (selected_success_type) {
      params = params.set('selected_success_type', selected_success_type);
    }
    params = params.set('ccva_graph_db_source', ccva_graph_db_source);
    if (start_date) {
      params = params.set('start_date', start_date);
    }
    if (end_date) {
      params = params.set('end_date', end_date);
    }
    if (date_type) {
      params = params.set('date_type', date_type);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', JSON.stringify(locations.map(l => ({ field: l.field, value: l.value }))));
    }
    if (ccvaId && ccvaId.length > 0) {
      pathUrl = `${this.configService.API_URL}/ccva?ccva_id=${ccvaId}`;
    }
    return this.http.get(pathUrl, { params });
  }

  // Get the list of CCVA results
  get_list__ccva_Results() {
    return this.http.get(`${this.configService.API_URL}/ccva/list`, {});
  }

  // Get the individual VA-level classifications for one CCVA run
  // ("Display Data"), paginated/sortable server-side, filterable by VA ID
  // (free text) plus one of filterBy's fields (Gender/Age Group/Broad
  // Category/Major Category).
  get_ccva_individual_results(
    taskId: string,
    pageNumber: number = 1,
    limit: number = 10,
    searchVaId?: string,
    filterBy?: string,
    filterValue?: string,
    sortBy?: string,
    sortDir: 'asc' | 'desc' = 'asc'
  ) {
    let params = new HttpParams()
      .set('page_number', pageNumber.toString())
      .set('limit', limit.toString())
      .set('sort_dir', sortDir);
    if (searchVaId) {
      params = params.set('search_va_id', searchVaId);
    }
    if (filterBy && filterValue) {
      params = params.set('filter_by', filterBy).set('filter_value', filterValue);
    }
    if (sortBy) {
      params = params.set('sort_by', sortBy);
    }
    return this.http.get(`${this.configService.API_URL}/ccva/${taskId}/results`, { params });
  }

  // Distinct Gender/Age Group/Broad Category/Major Category values that
  // actually occur in this run, for the Filter Value dropdown.
  get_ccva_filter_options(taskId: string) {
    return this.http.get(`${this.configService.API_URL}/ccva/${taskId}/filter-options`, {});
  }

  // Set an item as default
  set_default_ccva(id: string) {
    return this.http.post(
      `${this.configService.API_URL}/ccva/${id}/set-default`,
      {}
    );
  }
  // Clear an item's default status
  clear_default_ccva(id: string) {
    return this.http.post(
      `${this.configService.API_URL}/ccva/${id}/clear-default`,
      {}
    );
  }
  download_default_ccva(task_id: string) {
    window.open(
      `${this.configService.API_URL}/ccva/download_ccva_results/${task_id}?file_format=csv`
    );
  }

  // Delete a CCVA result
  delete_ccva(id: string) {
    return this.http.delete(`${this.configService.API_URL}/ccva/${id}`);
  }

  // "Download the table" on the individual-results page - same
  // XLSX.utils.json_to_sheet + file-saver pattern as
  // SubmissionsService.exportToExcel.
  exportToExcel(data: any[], fileName: string): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = {
      Sheets: { data: worksheet },
      SheetNames: ['data'],
    };
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob: Blob = new Blob([excelBuffer], { type: EXCEL_TYPE });
    FileSaver.saveAs(blob, fileName + EXCEL_EXTENSION);
  }
}
