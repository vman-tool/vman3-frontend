import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, map, mergeMap, of, tap } from 'rxjs';
import { ConfigService } from 'app/app.service';
import { ErrorEmitters } from 'app/core/emitters/error.emitters';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';

@Injectable({
  providedIn: 'root',
})
export class TriggersService {
  private triggerCCVAListRefreshFunctionSubject = new Subject<void>();

  triggerCCVAListFunction$ =
    this.triggerCCVAListRefreshFunctionSubject.asObservable();

  triggerCCVAListFunction() {
    this.triggerCCVAListRefreshFunctionSubject.next();
  }
}
