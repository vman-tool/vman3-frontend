import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSockettService {
  private socket: WebSocket | undefined;
  private messageSubject: Subject<string> = new Subject<string>();

  constructor(private ngZone: NgZone) {}

  connect(url: string): void {
    this.socket = new WebSocket(url);

    this.socket.onopen = (event) => {
      console.log('WebSocket connection opened:', event);
    };

    this.socket.onmessage = (event) => {
      console.log('Message from server:', typeof event.data);
      // Explicit NgZone.run, rather than relying on zone.js's own WebSocket
      // patch: a message handled outside the Angular zone still updates
      // this.messageSubject's subscribers' state just fine, but Angular
      // never schedules a re-render for it - the progress bar would sit at
      // whatever it last painted until some unrelated event (a click, a
      // timer elsewhere) happened to trigger change detection, at which
      // point everything queued up in between would appear to "jump" at
      // once. This guarantees a render is scheduled for every message.
      this.ngZone.run(() => {
        this.messageSubject.next(event.data); // Emit the received message to subscribers
      });
    };

    this.socket.onerror = (event) => {
      console.error('WebSocket error:', event);
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
    };
  }

  // Expose the message observable so components can subscribe to it
  get messages(): Observable<string> {
    return this.messageSubject.asObservable();
  }

  sendMessage(message: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      console.error('WebSocket connection is not open. Cannot send message.');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
}
