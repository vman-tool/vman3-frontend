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

// Shared distribution stat shape — `avg` field differs per metric type
export interface DistStat {
  avg:    number | null;   // avg_minutes (duration) or avg_ics (proportion 0-1)
  min_v:  number | null;
  max_v:  number | null;
  stddev: number | null;
  p50:    number | null;   // median
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

@Injectable({ providedIn: 'root' })
export class GeneralDqaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

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
