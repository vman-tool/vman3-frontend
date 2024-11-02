import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from '../../../app.service';

@Injectable({
  providedIn: 'root',
})
export class CcvaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}
  get_ccva_by_id(
    ccvaId: string,
    start_date?: string,
    end_date?: string,
    locations?: string[],
    date_type?: string,
    ccva_graph_db_source: boolean = true
  ) {
    let params = new HttpParams();
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
      params = params.set('locations', locations.join(','));
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
    start_date?: string,
    end_date?: string,
    locations?: string[],
    date_type?: string,
    ccva_graph_db_source: boolean = true
  ) {
    let pathUrl = `${this.configService.API_URL}/ccva`;
    let params = new HttpParams();
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
      params = params.set('locations', locations.join(','));
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

  // Set an item as default
  set_default_ccva(id: string) {
    return this.http.post(
      `${this.configService.API_URL}/ccva/${id}/set-default`,
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
}
