import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ConfigService } from 'app/app.service';
import { ResponseMainModel } from '../../../shared/interface/main.interface';
import { settingsConfigData, SystemImages } from '../interface';

@Injectable({
  providedIn: 'root',
})
export class SettingConfigService {
  private configCache: Partial<settingsConfigData> | null = null;
  private lastFetchTime: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient, private configService: ConfigService) { }

  // General method to save data
  saveConnectionData(
    type: 'odk_api_configs' | 'system_configs' | 'field_mapping' | 'va_summary' | 'field_labels' | 'sync_status',
    data: any
  ): Observable<ResponseMainModel<any>> {
    return this.http
      .post<ResponseMainModel<any>>(
        `${this.configService.API_URL}/settings/system_configs`,
        {
          [type]: data,
          type: type,
        }
      )
      .pipe(
        tap((response) => {
          // Update cache only if the save operation is successful
          if (response && !response.error) {
            this.configCache = {
              ...this.configCache,
              [type]: data,
            } as settingsConfigData;
          }
        }),
        catchError((error: any) => {
          console.error('Error:', error);
          // Re-throw the error so the component's error handler can catch it
          throw error;
        })
      );
  }

  // General method to get all configuration data
  getSettingsConfig(
    cached: boolean = true  // Default to using cache to prevent infinite requests
  ): Observable<settingsConfigData | null> {
    const now = Date.now();
    const isCacheValid = this.configCache && cached && (now - this.lastFetchTime) < this.CACHE_DURATION;

    if (isCacheValid) {
      return of(this.configCache as settingsConfigData);
    } else {
      return this.http
        .get<ResponseMainModel<settingsConfigData>>(
          `${this.configService.API_URL}/settings/system_configs`
        )
        .pipe(
          map((response) => {
            if (response && !response.error && response.data) {
              // Ensure all required properties are set
              const config: settingsConfigData = {
                odk_api_configs:
                  response.data.odk_api_configs ||
                  {
                    /* default values */
                  },
                system_configs:
                  response.data.system_configs ||
                  {
                    /* default values */
                  },
                field_mapping:
                  response.data.field_mapping ||
                  {
                    /* default values */
                  },
                va_summary:
                  response.data?.va_summary ||
                  [],
                field_labels:
                  response.data?.field_labels ||
                  [],
                sync_status:
                  response.data?.sync_status ||
                  {
                    last_sync_date: undefined,
                    last_sync_data_count: 0,
                    total_synced_data: 0
                  },
              };
              return config;
            }
            return null;
          }),
          tap((data: settingsConfigData | null) => {
            if (data) {
              this.configCache = data;
              this.lastFetchTime = Date.now();
            }
          }),
          catchError((error: any) => {
            console.error('Error:', error);
            return of(null);
          })
        );
    }
  }

  // method to get fields from the API
  getFields(): Observable<string[]> {
    return this.http.get<string[]>(`${this.configService.API_URL}/fields`).pipe(
      catchError((error: any) => {
        console.error('Error fetching fields:', error);
        return of([]); // Return an empty array on error
      })
    );
  }

  getTables(): Observable<string[]> {
    return this.http.get<string[]>(`${this.configService.API_URL}/tables`).pipe(
      catchError((error: any) => {
        console.error('Error fetching tables:', error);
        return of([]); // Return an empty array on error
      })
    );
  }

  getSystemImages(): Observable<any> {
    return this.http.get<any>(`${this.configService.API_URL}/settings/system_images/`).pipe(
      catchError((error: any) => {
        console.error('Error fetching system images:', error);
        return of([]); // Return an empty array on error
      })
    );
  }

  saveSystemImages(images: SystemImages) {
    const formData = new FormData();
    if (images.favicon) {
      formData.append('favicon', images.favicon);
    }
    if (images.logo) {
      formData.append('logo', images.logo);
    }
    if (images.home_image) {
      formData.append('login_image', images.home_image);
    }

    return this.http.post<any>(`${this.configService.API_URL}/settings/system_images/`, formData).pipe(
      catchError((error: any) => {
        console.error('Error fetching system images:', error);
        return of([]);
      })
    )
  }

  resetImages() {
    return this.http.delete<any>(`${this.configService.API_URL}/settings/system_images/`).pipe(
      catchError((error: any) => {
        console.error('Error resetting system images:', error);
        return of([]);
      })
    )
  }

  clearCache(): void {
    this.configCache = null;
    this.lastFetchTime = 0;
  }

  getUniqueValuesOfField(field: string): Observable<any> {
    console.log(field, 'get-field-unique-value')
    return this.http.get<string[]>(`${this.configService.API_URL}/settings/get-field-unique-value?field=${field}`)
  }
}
