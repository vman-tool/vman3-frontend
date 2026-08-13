import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from 'app/app.service';
import { RunCcvaService } from './run-ccva.service';
import { TriggersService } from '../../../core/services/triggers/triggers.service';
import { LocalStorageWithTTL } from '../../../shared/services/localstorage_with_ttl.services';

export type CcvaRunStatus = 'idle' | 'starting' | 'running' | 'completed' | 'error';

export interface CcvaRunState {
  status: CcvaRunStatus;
  taskId: string | null;
  progress: number;
  message: string;
  totalRecords: number;
  elapsedTime: string;
  logs: string[];
}

const INITIAL_STATE: CcvaRunState = {
  status: 'idle',
  taskId: null,
  progress: 0,
  message: '',
  totalRecords: 0,
  elapsedTime: '0:00:00',
  logs: [],
};

const TASK_ID_KEY = 'ccva-taskId';
const PROGRESS_KEY = 'ccva-progress';
const START_TIME_KEY = 'ccva-startTime';

// Owns the CCVA run's state and its websocket connection as an app-lifetime
// singleton, instead of tying either to whichever component happens to be
// mounted on /ccva. A run started here keeps progressing - and the socket
// stays open - no matter where the user navigates; the previous
// component-scoped version closed the socket in ngOnDestroy and had to fake
// continuity across remounts via localStorage + HTTP resync + a brand new
// socket reconnect every time, which is what let the Run button re-enable
// itself on navigating back before the resync had a chance to land.
//
// Deliberately uses its own dedicated WebSocket rather than the shared
// WebSockettService: that service holds exactly one socket + one message
// Subject for the whole app (also used by PCVA's discordants-chat and
// settings' data-sync), so a long-lived CCVA connection sharing it would
// risk cross-feature message mixing the moment another feature calls
// connect() while a CCVA run is still in flight in the background.
@Injectable({ providedIn: 'root' })
export class CcvaRunStateService {
  private subj = new BehaviorSubject<CcvaRunState>(INITIAL_STATE);
  state$ = this.subj.asObservable();

  private socket: WebSocket | undefined;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private runCcvaService: RunCcvaService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private triggersService: TriggersService
  ) {
    this.rehydrate();
  }

  private get state(): CcvaRunState {
    return this.subj.value;
  }

  private patch(partial: Partial<CcvaRunState>): void {
    this.subj.next({ ...this.state, ...partial });
  }

  // Runs once, when the app boots (this service is a singleton) - picks up
  // a task that was still running from a previous page load (hard refresh
  // or new tab), rather than on every /ccva mount like the old component did.
  private rehydrate(): void {
    const storedTaskId = localStorage.getItem(TASK_ID_KEY);
    if (!storedTaskId) return;

    const storedProgress = LocalStorageWithTTL.getItemWithTTL(PROGRESS_KEY);
    if (storedProgress) {
      this.patch({
        status: 'running',
        taskId: storedTaskId,
        progress: storedProgress.progress ?? 0,
        message: storedProgress.message ?? '',
        totalRecords: storedProgress.totalRecords ?? 0,
        logs: storedProgress.logs ?? [],
      });
    } else {
      this.patch({ status: 'running', taskId: storedTaskId });
    }

    this.runCcvaService.getTaskProgress(storedTaskId).subscribe({
      next: (progressData) => {
        if (progressData) this.applyUpdate(progressData);
      },
      error: (err) => console.error('Failed to fetch task progress:', err),
    });

    this.connectSocket(storedTaskId);
  }

  startRun(filter: any): void {
    this.resetForNewRun();
    this.runCcvaService.run_ccva(filter).subscribe({
      next: (response: any) => this.handleStartSuccess(response),
      error: (error: any) => this.handleStartError(error, 'Failed to start CCVA task'),
    });
  }

  startRunWithCSV(formData: FormData): void {
    this.resetForNewRun();
    this.runCcvaService.runCcvaWithCSV(formData).subscribe({
      next: (response: any) => this.handleStartSuccess(response),
      error: (error: any) => this.handleStartError(error, 'Failed to start CCVA task with CSV'),
    });
  }

  private handleStartSuccess(response: any): void {
    const taskId = response?.data?.task_id;
    if (!taskId) return;
    localStorage.setItem(TASK_ID_KEY, taskId);
    this.patch({ status: 'running', taskId });
    this.applyUpdate(response.data);
    this.connectSocket(taskId);
  }

  private handleStartError(error: any, fallbackMessage: string): void {
    console.error(fallbackMessage, error);
    this.patch({ status: 'error', message: error?.error?.detail ?? error?.error?.message ?? fallbackMessage });
    this.triggersService.triggerCCVAListFunction();
    this.snackBar.open(
      `${error?.error?.detail ?? error?.error?.message ?? fallbackMessage}`,
      'Close',
      { horizontalPosition: 'end', verticalPosition: 'top', duration: 3000 }
    );
  }

  cancelRun(): void {
    this.disconnectSocket();
    this.clearLocalStorage();
    this.triggersService.triggerCCVAListFunction();
    this.subj.next({ ...INITIAL_STATE });
  }

  clearLogs(): void {
    this.patch({ logs: [] });
  }

  private resetForNewRun(): void {
    this.disconnectSocket();
    this.clearLocalStorage();
    this.subj.next({ ...INITIAL_STATE, status: 'starting' });
  }

  private connectSocket(taskId: string): void {
    this.disconnectSocket();

    if (!localStorage.getItem(START_TIME_KEY)) {
      localStorage.setItem(START_TIME_KEY, Date.now().toString());
    }
    this.startCountdown(parseInt(localStorage.getItem(START_TIME_KEY) ?? `${Date.now()}`, 10));

    this.socket = new WebSocket(`${this.configService.API_URL_WS}/ccva_progress/${taskId}`);
    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed) this.applyUpdate(parsed);
      } catch (error) {
        console.error('Error parsing CCVA progress message:', error);
      }
    };
    this.socket.onerror = (event) => console.error('CCVA WebSocket error:', event);
  }

  private disconnectSocket(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private applyUpdate(parsedData: any): void {
    const logs = parsedData.log ? [...this.state.logs, parsedData.log] : this.state.logs;

    if (parsedData.status === 'completed') {
      this.patch({
        status: 'completed',
        progress: 100,
        message: 'Analysis complete.',
        totalRecords: parsedData.total_records || 0,
        elapsedTime: parsedData.elapsed_time ?? this.state.elapsedTime,
        logs,
      });
      this.triggersService.triggerCCVAListFunction();
      this.clearLocalStorage();
      this.disconnectSocket();
      return;
    }

    if (parsedData.error === true) {
      this.patch({
        status: 'error',
        message: parsedData.message ?? 'CCVA task failed.',
        elapsedTime: parsedData.elapsed_time ?? this.state.elapsedTime,
        logs,
      });
      this.triggersService.triggerCCVAListFunction();
      this.clearLocalStorage();
      this.disconnectSocket();
      this.snackBar.open(`${parsedData.message}`, 'Close', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 8000,
      });
      return;
    }

    if (parsedData.progress === undefined || parsedData.progress === null || parsedData.progress === '') {
      if (logs !== this.state.logs) this.patch({ logs });
      return;
    }

    const progress = Number(parsedData.progress) || 0;
    const message = parsedData.message ?? '';
    const totalRecords = parsedData.total_records || 0;
    this.patch({ status: 'running', progress, message, totalRecords, logs });

    LocalStorageWithTTL.setItemWithTTL(
      PROGRESS_KEY,
      { progress, message, totalRecords, logs },
      1000 * 60 * 5
    );
  }

  private startCountdown(startTime: number): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.patch({ elapsedTime: this.formatElapsed(Date.now() - startTime) });
    }, 1000);
  }

  private formatElapsed(ms: number): string {
    let totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (v: number) => (v < 10 ? `0${v}` : `${v}`);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  private clearLocalStorage(): void {
    localStorage.removeItem(TASK_ID_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(START_TIME_KEY);
  }
}
