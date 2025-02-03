import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { catchError, retry, Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class DiscordantsVaService {

  private socket$?: WebSocketSubject<any>;
  private messagesSubject$ = new Subject<any>();
  public messages$ = this.messagesSubject$.asObservable();

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

  public connect(va_id: string): void {
    let count = 1
    const token = localStorage.getItem('access_token') || '';
    this.socket$ = webSocket({
      url: `${this.configService.API_URL_WS}/pcva/get-discordant-messages/${va_id}?token=${token}`,
      deserializer: (msg) => JSON.parse(msg.data),
    });

    this.socket$
      .pipe(
        retry({ count: 3, delay: 3000 }),
        catchError((error) => {
          console.error('WebSocket error:', error);
          return [];
        })
      )
      .subscribe((message) => {
        this.messagesSubject$.next(message);
      });
  }

  public sendMessage(msg: any): void {
    if (this.socket$) {
      this.socket$.next(msg);
    }
  }

  public close(): void {
    if (this.socket$) {
      this.socket$.complete();
    }
  }
}
