// import { Injectable } from '@angular/core';
// import { Socket } from 'ngx-socket-io';
// import { Observable, Subject } from 'rxjs';

// @Injectable({
//   providedIn: 'root',
// })
// export class WebsocketService {
//   private reconnectInterval = 3000; // 3 seconds
//   private reconnectAttempts = 10;
//   private connectionStatus$: Subject<boolean> = new Subject<boolean>();

//   constructor(private socket: Socket) {}

//   public connect(authToken: string) {
//     // Pass the authentication token during the WebSocket handshake
//     // this.socket.ioSocket.opts.query = {};
//     this.socket.connect();
//     this.registerEventHandlers();
//   }

//   public disconnect() {
//     this.socket.disconnect();
//     this.connectionStatus$.next(false);
//   }

//   public sendMessage(message: string) {
//     this.socket.emit('message', message);
//   }

//   public onMessage(): Observable<string> {
//     return this.socket.fromEvent('message');
//   }

//   public onConnectionStatus(): Observable<boolean> {
//     return this.connectionStatus$.asObservable();
//   }

//   private registerEventHandlers() {
//     this.socket.on('connect', () => {
//       this.connectionStatus$.next(true);
//     });

//     this.socket.on('disconnect', () => {
//       this.connectionStatus$.next(false);
//       this.attemptReconnect();
//     });

//     this.socket.on('connect_error', (error: any) => {
//       console.error('WebSocket connection error:', error);
//     });
//   }

//   private attemptReconnect() {
//     let attempts = 0;
//     const reconnectIntervalId = setInterval(() => {
//       if (attempts >= this.reconnectAttempts) {
//         clearInterval(reconnectIntervalId);
//         console.error('WebSocket reconnection attempts exhausted.');
//       } else {
//         attempts++;
//         this.socket.connect();
//         // if (this.socket.connected) {
//         // clearInterval(reconnectIntervalId);
//         // this.connectionStatus$.next(true);
//         // }
//       }
//     }, this.reconnectInterval);
//   }
// }
