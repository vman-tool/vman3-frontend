import { of } from 'rxjs';

import { CcvaRunStateService } from './ccva-run-state.service';

// Fake WebSocket - jsdom doesn't implement one, and this service never
// actually needs it to connect anywhere for these tests (only the
// reconciliation poll and the socket's own lifecycle plumbing are under
// test here, not real message delivery, which every OTHER existing code
// path in this service already covers implicitly via its message-driven
// applyUpdate() logic).
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }
}

describe('CcvaRunStateService (unit)', () => {
  function makeService(getTaskProgress = jest.fn().mockReturnValue(of(null))) {
    const runCcvaService = {
      run_ccva: jest.fn(),
      runCcvaWithCSV: jest.fn(),
      getTaskProgress,
    } as any;
    const configService = { API_URL_WS: 'ws://test' } as any;
    const snackBar = { open: jest.fn() } as any;
    const triggersService = { triggerCCVAListFunction: jest.fn() } as any;

    const service = new CcvaRunStateService(runCcvaService, configService, snackBar, triggersService);
    return { service, runCcvaService, snackBar, triggersService };
  }

  function latestState(service: CcvaRunStateService) {
    let value: any;
    service.state$.subscribe(s => (value = s));
    return value;
  }

  beforeEach(() => {
    localStorage.clear();
    MockWebSocket.instances = [];
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens a WebSocket at API_URL_WS/ccva_progress/{taskId} when a run starts', () => {
    const { service, runCcvaService } = makeService();
    runCcvaService.run_ccva.mockReturnValue(of({ data: { task_id: 'task-1', progress: 1 } }));

    service.startRun({});

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://test/ccva_progress/task-1');
  });

  describe('reconciliation poll', () => {
    it('does not poll before the interval elapses', () => {
      jest.useFakeTimers();
      const getTaskProgress = jest.fn().mockReturnValue(of(null));
      const { service, runCcvaService } = makeService(getTaskProgress);
      runCcvaService.run_ccva.mockReturnValue(of({ data: { task_id: 'task-1', progress: 1 } }));

      service.startRun({});

      expect(getTaskProgress).not.toHaveBeenCalled();
    });

    it('polls getTaskProgress on the same taskId every ~20s while running', () => {
      jest.useFakeTimers();
      const getTaskProgress = jest.fn().mockReturnValue(of(null));
      const { service, runCcvaService } = makeService(getTaskProgress);
      runCcvaService.run_ccva.mockReturnValue(of({ data: { task_id: 'task-1', progress: 1 } }));

      service.startRun({});
      jest.advanceTimersByTime(20_000);
      expect(getTaskProgress).toHaveBeenCalledTimes(1);
      expect(getTaskProgress).toHaveBeenCalledWith('task-1');

      jest.advanceTimersByTime(20_000);
      expect(getTaskProgress).toHaveBeenCalledTimes(2);
    });

    it('feeds a poll response through the same completion handling as a socket message', () => {
      // This is the actual fix for the "stuck at Running... forever" bug:
      // a WebSocket that silently died mid-run no longer means the UI is
      // stuck - this poll discovers the true status independently.
      jest.useFakeTimers();
      const getTaskProgress = jest.fn().mockReturnValue(
        of({ status: 'completed', progress: 100, total_records: 42, elapsed_time: '0:05:00' })
      );
      const { service, runCcvaService, triggersService } = makeService(getTaskProgress);
      runCcvaService.run_ccva.mockReturnValue(of({ data: { task_id: 'task-1', progress: 1 } }));

      service.startRun({});
      jest.advanceTimersByTime(20_000);

      const state = latestState(service);
      expect(state.status).toBe('completed');
      expect(state.progress).toBe(100);
      expect(state.totalRecords).toBe(42);
      expect(triggersService.triggerCCVAListFunction).toHaveBeenCalled();
    });

    it('stops polling once a terminal status is reached', () => {
      jest.useFakeTimers();
      const getTaskProgress = jest.fn().mockReturnValue(of({ status: 'completed', progress: 100 }));
      const { service, runCcvaService } = makeService(getTaskProgress);
      runCcvaService.run_ccva.mockReturnValue(of({ data: { task_id: 'task-1', progress: 1 } }));

      service.startRun({});
      jest.advanceTimersByTime(20_000);
      expect(getTaskProgress).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60_000); // would be 3 more ticks if still polling
      expect(getTaskProgress).toHaveBeenCalledTimes(1);
    });

    it('stops polling immediately when the run is cancelled', () => {
      jest.useFakeTimers();
      const getTaskProgress = jest.fn().mockReturnValue(of(null));
      const { service, runCcvaService } = makeService(getTaskProgress);
      runCcvaService.run_ccva.mockReturnValue(of({ data: { task_id: 'task-1', progress: 1 } }));

      service.startRun({});
      service.cancelRun();
      jest.advanceTimersByTime(60_000);

      expect(getTaskProgress).not.toHaveBeenCalled();
      expect(latestState(service).status).toBe('idle');
    });
  });

  describe('socket lifecycle', () => {
    it('closing the socket does not itself change state (the poll is the recovery path, not reconnection)', () => {
      const { service, runCcvaService } = makeService();
      runCcvaService.run_ccva.mockReturnValue(of({ data: { task_id: 'task-1', progress: 1 } }));

      service.startRun({});
      const socket = MockWebSocket.instances[0];
      socket.onclose?.({} as any);

      expect(latestState(service).status).toBe('running');
    });
  });
});
