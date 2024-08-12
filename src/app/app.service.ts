import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: any;

  constructor(private http: HttpClient) { }

  loadConfig(): Promise<any> {
    return firstValueFrom(this.http.get('/assets/config.json').pipe(
      map(config => {
        this.config = config;
        return this.config;
      })
    ));
  }

  get API_URL(): string {
    return this.config?.API_URL;
  }
}
