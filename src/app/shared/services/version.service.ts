import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root'
})
export class VersionService {

  constructor(private http: HttpClient, private configService: ConfigService) { }

  getVersionService(){
    return  this.http.get(`${this.configService.API_URL}/settings/version`)
  }
}
