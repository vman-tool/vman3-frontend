import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, timer, Subscription, lastValueFrom } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService implements OnDestroy {
  private readonly TOKEN_CHECK_INTERVAL = 1000; // 1 second in milliseconds
  private readonly ACTIVITY_DEBOUNCE = 1000; // 1 second debounce for activity events
  
  private destroy$ = new BehaviorSubject<boolean>(false);
  private isTracking = false;
  
  private activitySubscription?: Subscription;
  private tokenCheckSubscription?: Subscription;
  
  // Keep these as private subjects for internal state management
  private readonly sessionState = new BehaviorSubject<{
    lastActivity: number;
    isActive: boolean;
    sessionStart: number;
  }>({
    lastActivity: Date.now(),
    isActive: false,
    sessionStart: Date.now()
  });

  constructor(private authService: AuthService) {
    // Automatically start tracking when service is instantiated
    this.startBackgroundTracking();
  }

  private startBackgroundTracking(): void {
    console.log("Starting background tracking");
    if (this.isTracking) {
      return;
    }

    this.isTracking = true;
    this.updateSessionState({
      sessionStart: Date.now(),
      lastActivity: Date.now(),
      isActive: true
    });

    // Track user activity in the background
    const activity$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'click'),
      fromEvent(document, 'scroll')
    ).pipe(
      debounceTime(this.ACTIVITY_DEBOUNCE),
      takeUntil(this.destroy$)
    );

    this.activitySubscription = activity$.subscribe(() => {
      this.updateSessionState({
        ...this.sessionState.value,
        lastActivity: Date.now()
      });
    });

    // Background token checking
    this.tokenCheckSubscription = timer(0, this.TOKEN_CHECK_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(async () => {
        await this.checkTokenStatus();
      });
  }

  private async checkTokenStatus(): Promise<void> {
    try {
      const now = Date.now() / 1000;
      const accessTokenExpiry = Number(localStorage.getItem('access_token_expiry')) || 0;
      const refreshTokenExpiry = Number(localStorage.getItem('refresh_token_expiry')) || 0;

      if (now >= refreshTokenExpiry) {
        await this.handleSessionExpiration();
      } else if (now >= accessTokenExpiry) {
        await this.handleTokenRefresh();
      }
    } catch (error) {
      console.error('Token check failed:', error);
      // Optionally implement retry logic here
    }
  }

  private async handleSessionExpiration(): Promise<void> {
    this.stopBackgroundTracking();
    await this.authService.logout();
    // Optionally notify other services about logout
  }

  private async handleTokenRefresh(): Promise<void> {
    try {
      const refresh = await lastValueFrom(this.authService.refresh_token());
      if(refresh){
        this.startBackgroundTracking();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.handleSessionExpiration();
    }
  }

  private updateSessionState(newState: Partial<{
    lastActivity: number;
    isActive: boolean;
    sessionStart: number;
  }>): void {
    this.sessionState.next({
      ...this.sessionState.value,
      ...newState
    });
  }

  private stopBackgroundTracking(): void {
    console.log("Stopping background tracking");
    this.isTracking = false;
    this.activitySubscription?.unsubscribe();
    this.tokenCheckSubscription?.unsubscribe();
    this.updateSessionState({
      ...this.sessionState.value,
      isActive: false
    });
  }

  public isSessionActive(): boolean {
    return this.sessionState?.value?.isActive;
  }

  public getSessionDuration(): number {
    return Date.now() - this.sessionState?.value?.sessionStart;
  }

  public getTimeSinceLastActivity(): number {
    return Date.now() - this.sessionState?.value?.lastActivity;
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
    this.stopBackgroundTracking();
  }
}