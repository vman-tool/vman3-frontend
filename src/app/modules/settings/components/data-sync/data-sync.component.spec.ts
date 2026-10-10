import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatePipe } from '@angular/common';
import { DataSyncComponent } from './data-sync.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DataSyncComponent', () => {
  let component: DataSyncComponent;
  let fixture: ComponentFixture<DataSyncComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataSyncComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), DatePipe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataSyncComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('WS inactivity watchdog (re-armed on every live progress message)', () => {
    // Regression: startWsInactivityTimer used to be called only once, when
    // restoring a running task after a page reload - a live sync's own
    // "running" messages never re-armed it. If the WebSocket connection
    // dropped mid-sync (not the task finishing, just the socket going
    // quiet), nothing ever noticed: isTaskRunning stayed true forever and
    // the progress bar froze at its last value with no way out except a
    // manual page refresh.
    afterEach(() => {
      jest.useRealTimers();
    });

    function runningMessage(overrides: Partial<any> = {}) {
      return {
        total_records: 100,
        progress: 10,
        elapsed_time: 1,
        records_processed: 10,
        status: 'running',
        ...overrides,
      };
    }

    it('arms a fallback that stops treating the task as running if nothing else arrives within 15s', () => {
      jest.useFakeTimers();
      const refreshSpy = jest.spyOn(component, 'loadSyncStatusFromSettings').mockImplementation(() => {});
      jest.spyOn(component, 'loadSyncHistory').mockImplementation(() => {});

      (component as any).updateProgress(runningMessage());
      expect(component.isTaskRunning).toBe(true);

      jest.advanceTimersByTime(15000);

      expect(component.isTaskRunning).toBe(false);
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('a second live message before the fallback fires re-arms it, instead of letting the first one still fire on schedule', () => {
      jest.useFakeTimers();
      jest.spyOn(component, 'loadSyncStatusFromSettings').mockImplementation(() => {});
      jest.spyOn(component, 'loadSyncHistory').mockImplementation(() => {});

      (component as any).updateProgress(runningMessage({ progress: 10, records_processed: 10 }));
      jest.advanceTimersByTime(10000); // 10s after the first message - under its own 15s budget

      (component as any).updateProgress(runningMessage({ progress: 20, records_processed: 20 }));
      jest.advanceTimersByTime(10000); // 20s after the first message, but only 10s after the second

      // The first message's 15s deadline (at t=15s) has long passed, but the
      // second message re-armed the watchdog - without the fix this would
      // already be false.
      expect(component.isTaskRunning).toBe(true);

      jest.advanceTimersByTime(5000); // now 15s after the second message
      expect(component.isTaskRunning).toBe(false);
    });

    it('completing the task clears its still-pending watchdog, instead of leaving a stale fallback to fire later too', () => {
      jest.useFakeTimers();
      const refreshSpy = jest.spyOn(component, 'loadSyncStatusFromSettings').mockImplementation(() => {});
      jest.spyOn(component, 'loadSyncHistory').mockImplementation(() => {});

      (component as any).updateProgress(runningMessage());           // arms the watchdog for t=15000
      jest.advanceTimersByTime(5000);                                 // t=5000 - well before it fires
      (component as any).updateProgress(runningMessage({ status: 'completed', progress: 100 }));
      // The completion branch schedules its own one-off refresh 1.5s later (t=6500) - that's expected and not what's under test.
      refreshSpy.mockClear();

      jest.advanceTimersByTime(10000); // reaches t=15000 - the original watchdog's deadline

      // Exactly the completion branch's own scheduled refresh should have
      // fired by now, and nothing else - a still-armed, stale watchdog
      // would call this a second time right at t=15000.
      expect(refreshSpy).toHaveBeenCalledTimes(1);
    });
  });
});
