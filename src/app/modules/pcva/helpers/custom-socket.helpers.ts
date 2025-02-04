import { WebSocketSubject } from "rxjs/webSocket";

export class CustomWebSocket extends WebSocketSubject<any> {
  constructor(url: string, token: string) {
    super({
      url,
      protocol: [`authorization: Bearer ${token}`], // Sending token in subprotocol
    });
  }
}