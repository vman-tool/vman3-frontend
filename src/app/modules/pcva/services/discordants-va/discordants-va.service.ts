import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { catchError, retry, Subject, takeUntil } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class DiscordantsVaService {

  private socket$?: WebSocketSubject<any>;
  private messagesSubject$ = new Subject<any>();
  public messages$ = this.messagesSubject$.asObservable();
  private isConnected = false;
  private isDisconnected$: Subject<boolean> = new Subject<boolean>();

  constructor(private configService: ConfigService, private http: HttpClient) {
   }

  getDiscordants(pager?: { paging?: boolean, page_number?: number, limit?: number }, include_deleted?: boolean, va_id?: any) {
    let params = pager?.paging ? `?paging=${pager?.paging}` : '';

    params = params?.length && pager?.page_number ? params + `&page_number=${pager?.page_number}` : pager?.page_number ? params + `?page_number=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params + `&limit=${pager?.limit}` : pager?.limit ? params + `?limit=${pager?.limit}` : params;
    params = params?.length && include_deleted ? params + `&include_deleted=${include_deleted}` : include_deleted ? params + `?include_deleted=${include_deleted}` : params;

    params = params?.length && va_id ? params + `&coder=${va_id}` : va_id ? params + `?va_id=${va_id}` : params

    return this.http.get(`${this.configService.API_URL}/pcva/get-discordants${params}`);
  }

  getDiscordantMessages(va_id: string){
    return this.http.get(`${this.configService.API_URL}/pcva/get-discordant-messages/${va_id}`);
  }
  readDiscordantMessages(va_id: string){
    return this.http.post(`${this.configService.API_URL}/pcva/messages/${va_id}/read`, null);
  }

  connect(va_id: string): void {
    const token = localStorage.getItem('access_token') || '';
    this.socket$ = webSocket({
      url: `${this.configService.API_URL_WS}/discordants/chat/${va_id}?token=${token}`,
      deserializer: (msg) => JSON.parse(msg.data),
    });

    this.socket$
      .pipe(
        retry({ count: 3, delay: 3000 }),
        takeUntil(this.isDisconnected$),
        catchError((error) => {
          console.error('WebSocket error:', error);
          return [];
        })
      )
      .subscribe({
        next: (message) => {
          this.messagesSubject$.next(message);
        },
        error: (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
        },
        complete: () => this.isConnected = false
      });
  }

  sendMessage(msg: any): void {
    if (this.socket$) {
      this.socket$.next(msg);
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  close(): void {
    if (this.socket$) {
      this.isDisconnected$.next(true)
      this.socket$.complete();
    }
  }
}
