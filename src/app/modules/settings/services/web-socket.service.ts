import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSockettService {
  private socket: WebSocket | undefined;
  private messageSubject: Subject<string> = new Subject<string>();

  connect(url: string): void {
    this.socket = new WebSocket(url);

    this.socket.onopen = (event) => {
      console.log('WebSocket connection opened:', event);
    };

    this.socket.onmessage = (event) => {
      console.log('Message from server:', typeof event.data);
      this.messageSubject.next(event.data); // Emit the received message to subscribers
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
