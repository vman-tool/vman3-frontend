import { NgZone } from '@angular/core';
import { WebSockettService } from './web-socket.service';

// A minimal fake of the global WebSocket - just enough surface for connect()
// to assign its handlers and for a test to simulate a server message by
// invoking onmessage directly, the way a real socket would.
class FakeWebSocket {
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  closed = false;

  constructor(public url: string) {}

  close(): void {
    this.closed = true;
    this.onclose?.({});
  }
}

describe('WebSockettService', () => {
  let service: WebSockettService;
  let ngZone: NgZone;
  let lastSocket: FakeWebSocket;
  let originalWebSocket: any;

  beforeEach(() => {
    originalWebSocket = (global as any).WebSocket;
    (global as any).WebSocket = jest.fn().mockImplementation((url: string) => {
      lastSocket = new FakeWebSocket(url);
      return lastSocket;
    });

    ngZone = new NgZone({ enableLongStackTrace: false });
    service = new WebSockettService(ngZone);
  });

  afterEach(() => {
    (global as any).WebSocket = originalWebSocket;
  });

  it('emits an incoming message to subscribers', () => {
    service.connect('ws://example.test/progress/abc');
    const received: string[] = [];
    service.messages.subscribe(msg => received.push(msg));

    lastSocket.onmessage!({ data: '{"progress":10}' });

    expect(received).toEqual(['{"progress":10}']);
  });

  it('delivers the message from inside the Angular zone, so change detection is reliably scheduled for it', () => {
    // Regression: the native WebSocket's onmessage handler was reassigned
    // directly with no explicit zone handling. Emitting from outside the
    // Angular zone still updates every subscriber's state fine, but Angular
    // never schedules a render for it - the UI would sit frozen at its last
    // value until some unrelated event happened to trigger change detection,
    // at which point everything that arrived in between would appear to
    // "jump" all at once instead of updating smoothly as it came in.
    service.connect('ws://example.test/progress/abc');

    let wasInAngularZone: boolean | undefined;
    service.messages.subscribe(() => {
      wasInAngularZone = NgZone.isInAngularZone();
    });

    // Fire the message from outside Angular's zone, exactly as a real
    // browser WebSocket callback does by default.
    ngZone.runOutsideAngular(() => {
      lastSocket.onmessage!({ data: '{"progress":10}' });
    });

    expect(wasInAngularZone).toBe(true);
  });

  it('sends a message only while the socket is open', () => {
    service.connect('ws://example.test/progress/abc');
    (lastSocket as any).readyState = 0; // CONNECTING, not OPEN
    const sendSpy = jest.fn();
    (lastSocket as any).send = sendSpy;

    service.sendMessage('hello');

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('disconnect closes the underlying socket', () => {
    service.connect('ws://example.test/progress/abc');
    service.disconnect();
    expect(lastSocket.closed).toBe(true);
  });
});
