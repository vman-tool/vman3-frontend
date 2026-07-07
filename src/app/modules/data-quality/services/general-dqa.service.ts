import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ── ICI interfaces ─────────────────────────────────────────────────────────

export interface InterviewerIci {
  interviewer: string;
  total:   number;
  errors:  number;
  passed:  number;
  ici:     number;   // 0-100
}

export interface IciStats {
  overall_ici:    number | null;
  overall_total:  number;
  overall_passed: number;
  interviewers:   InterviewerIci[];
  checks_applied: string[];
}

// ── Distribution stat shape ─────────────────────────────────────────────────

export interface DistStat {
  avg:    number | null;
  min_v:  number | null;
  max_v:  number | null;
  stddev: number | null;
  p50:    number | null;
  count:  number;
}

export interface GroupedStats {
  overall: DistStat;
  by_age_group: {
    adults:   DistStat;
    children: DistStat;
    neonates: DistStat;
  };
  by_gender_adult: {
    male_adults:   DistStat;
    female_adults: DistStat;
  };
}

// ── Analytics snapshot ──────────────────────────────────────────────────────

export type SnapshotStatus = 'completed' | 'running' | 'failed';

export interface DqaSnapshot {
  rrs:         GroupedStats | null;
  ics:         GroupedStats | null;
  ici:         IciStats     | null;
  aid:         GroupedStats | null;
  computed_at: string       | null;
  status:      SnapshotStatus | null;
  error?:      string;
}

export interface DqaAnalyticsConfig {
  run_hour:             number;
  enabled:              boolean;
  last_triggered_date?: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GeneralDqaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  // ── Cached analytics snapshot (used on page load) ──────────────────────

  getAnalyticsSnapshot(): Observable<{ data: DqaSnapshot | null; message: string }> {
    return this.http
      .get<any>(`${this.configService.API_URL}/data-quality/analytics`)
      .pipe(catchError(err => {
        console.error('analytics snapshot error:', err);
        return of({ data: null, message: 'Failed to fetch analytics' });
      }));
  }

  refreshAnalytics(): Observable<{ message: string; status: string }> {
    return this.http
      .post<any>(`${this.configService.API_URL}/data-quality/analytics/refresh`, {})
      .pipe(catchError(err => {
        console.error('analytics refresh error:', err);
        return of({ message: 'Failed to start computation', status: 'error' });
      }));
  }

  getDqaAnalyticsConfig(): Observable<{ data: DqaAnalyticsConfig; message: string }> {
    return this.http
      .get<any>(`${this.configService.API_URL}/data-quality/analytics/config`)
      .pipe(catchError(err => {
        console.error('analytics config error:', err);
        return of({ data: { run_hour: 2, enabled: true }, message: 'Failed to fetch config' });
      }));
  }

  saveDqaAnalyticsConfig(config: DqaAnalyticsConfig): Observable<{ data: DqaAnalyticsConfig; message: string }> {
    return this.http
      .put<any>(`${this.configService.API_URL}/data-quality/analytics/config`, config)
      .pipe(catchError(err => {
        console.error('save analytics config error:', err);
        return of({ data: config, message: 'Failed to save config' });
      }));
  }

  // ── Live endpoints (kept for force-refresh fallback / debugging) ────────

  getInterviewDurationStats(): Observable<{ data: GroupedStats | null; message: string }> {
    return this.http
      .get<any>(`${this.configService.API_URL}/data-quality/interview-duration`)
      .pipe(catchError(err => {
        console.error('interview-duration error:', err);
        return of({ data: null, message: 'Failed to fetch data' });
      }));
  }

  getIcsStats(): Observable<{ data: GroupedStats | null; message: string }> {
    return this.http
      .get<any>(`${this.configService.API_URL}/data-quality/ics-stats`)
      .pipe(catchError(err => {
        console.error('ics-stats error:', err);
        return of({ data: null, message: 'Failed to fetch data' });
      }));
  }

  getRrsStats(): Observable<{ data: GroupedStats | null; message: string }> {
    return this.http
      .get<any>(`${this.configService.API_URL}/data-quality/rrs-stats`)
      .pipe(catchError(err => {
        console.error('rrs-stats error:', err);
        return of({ data: null, message: 'Failed to fetch data' });
      }));
  }

  getIciStats(): Observable<{ data: IciStats | null; message: string }> {
    return this.http
      .get<any>(`${this.configService.API_URL}/data-quality/ici-stats`)
      .pipe(catchError(err => {
        console.error('ici-stats error:', err);
        return of({ data: null, message: 'Failed to fetch data' });
      }));
  }
}
