import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from '../../../app.service';

@Injectable({
  providedIn: 'root',
})
export class CcvaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}
  get_ccva_by_id(ccvaId: string) {
    return this.http.get(
      `${this.configService.API_URL}/ccva?ccva_id=${ccvaId}`
    );
  }
  // Get all CCVA results
  get_ccva_Results() {
    return this.http.get(`${this.configService.API_URL}/ccva`, {});
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

  // Delete a CCVA result
  delete_ccva(id: string) {
    return this.http.delete(`${this.configService.API_URL}/ccva/${id}`);
  }
}
