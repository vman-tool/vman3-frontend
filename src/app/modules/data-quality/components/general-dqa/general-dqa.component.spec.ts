import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GeneralDqaComponent, INDICATOR_INFO, ActiveCard } from './general-dqa.component';
import { GeneralDqaService } from '../../services/general-dqa.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

const emptyDistStat = { avg: 0, min_v: 0, max_v: 0, stddev: 0, p50: 0, count: 0 };

describe('GeneralDqaComponent', () => {
  let component: GeneralDqaComponent;
  let fixture: ComponentFixture<GeneralDqaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GeneralDqaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .compileComponents();

    fixture = TestBed.createComponent(GeneralDqaComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Median Interview Duration (the "duration" card)', () => {
    // Regression test: this card used to read .avg (the mean), which is
    // misleading for a right-skewed duration distribution. It must read
    // .p50 (the median), matching its "Median Interview Duration" label
    // and the vman_dq manuscript's own MID definition.
    function loadSnapshotWithDuration(avg: number, p50: number) {
      const service = TestBed.inject(GeneralDqaService);
      jest.spyOn(service, 'getAnalyticsSnapshot').mockReturnValue(of({
        data: {
          status: 'completed',
          computed_at: '2026-01-01T00:00:00Z',
          rrs: null,
          ics: null,
          ici: null,
          aid: {
            overall: { avg, min_v: 1, max_v: 400, stddev: 50, p50, count: 100 },
            by_age_group: { adults: emptyDistStat, children: emptyDistStat, neonates: emptyDistStat },
            by_gender_adult: { male_adults: emptyDistStat, female_adults: emptyDistStat },
          },
        },
      } as any));
      fixture.detectChanges();
    }

    it('shows the median in the KPI card value, not the mean', () => {
      loadSnapshotWithDuration(90, 35);
      expect(component.overallDuration).toBe('35 min');
      expect(component.overallDuration).not.toBe('1h 30m');
    });

    it('classifies the tier badge off the median, not the mean', () => {
      // Default AID thresholds: <30min = Too Short, 30-60min = Normal
      // (no badge shown), >60min = Too Long. avg=90 would badge "Too Long";
      // p50=10 would badge "Too Short" - using a value on the opposite
      // side of Normal from avg makes this a meaningful regression check,
      // not just "no badge".
      loadSnapshotWithDuration(90, 10);
      expect(component.overallDurationTier?.label).toBe('Too Short');
    });

    it('labels the breakdown table column "Median Duration", not "Avg Duration"', () => {
      loadSnapshotWithDuration(90, 35);
      component.activeCard = 'duration';
      expect(component.activeCardLabel).toBe('Median Duration');
    });

    it('activeCentralValue reads p50 for duration and avg for every other indicator', () => {
      fixture.detectChanges();
      const stat = { avg: 90, min_v: 1, max_v: 400, stddev: 50, p50: 35, count: 100 };

      component.activeCard = 'duration';
      expect(component.activeCentralValue(stat)).toBe(35);

      component.activeCard = 'rrs';
      expect(component.activeCentralValue(stat)).toBe(90);
    });

    it('durationRowTier classifies a breakdown row off its own median, not its mean', () => {
      fixture.detectChanges();
      const stat = { avg: 90, min_v: 1, max_v: 400, stddev: 50, p50: 10, count: 100 };
      expect(component.durationRowTier(stat)?.label).toBe('Too Short');
    });
  });

  describe('indicator methodology popup', () => {
    it('is closed by default', () => {
      fixture.detectChanges();
      expect(component.infoCard).toBeNull();
    });

    it('openInfo opens the popup for the given card and stops the click from also switching activeCard', () => {
      fixture.detectChanges();
      component.activeCard = 'rrs';
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.openInfo('ics', event);

      expect(component.infoCard).toBe('ics');
      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(component.activeCard).toBe('rrs'); // unchanged
    });

    it('closeInfo clears it', () => {
      fixture.detectChanges();
      component.infoCard = 'ici';
      component.closeInfo();
      expect(component.infoCard).toBeNull();
    });

    it('re-opening the same card\'s (i) button toggles the popup closed', () => {
      fixture.detectChanges();
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.openInfo('duration', event);
      expect(component.infoCard).toBe('duration');

      component.openInfo('duration', event);
      expect(component.infoCard).toBeNull();
    });

    it('opening a different card\'s (i) button while one is open switches to the new card, not toggle it shut', () => {
      fixture.detectChanges();
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.openInfo('rrs', event);
      component.openInfo('ici', event);

      expect(component.infoCard).toBe('ici');
    });

    it('a click anywhere closes an open popup (the outside-click handler)', () => {
      fixture.detectChanges();
      component.infoCard = 'ics';

      component.onDocumentClickForInfoPopup();

      expect(component.infoCard).toBeNull();
    });

    it('the outside-click handler is a no-op when nothing is open', () => {
      fixture.detectChanges();
      component.infoCard = null;
      expect(() => component.onDocumentClickForInfoPopup()).not.toThrow();
      expect(component.infoCard).toBeNull();
    });

    it('provides methodology content for all 4 cards, each with a formula and at least one tier', () => {
      const cards: ActiveCard[] = ['rrs', 'ics', 'ici', 'duration'];
      for (const card of cards) {
        const info = INDICATOR_INFO[card];
        expect(info.name).toBeTruthy();
        expect(info.summary).toBeTruthy();
        expect(info.formula).toBeTruthy();
        expect(info.tiers.length).toBeGreaterThan(0);
        expect(info.notes.length).toBeGreaterThan(0);
      }
    });

    it('names the indicator "Median Interview Duration (MID)", not "Average"', () => {
      expect(INDICATOR_INFO.duration.name).toContain('Median Interview Duration');
      expect(INDICATOR_INFO.duration.name.toLowerCase()).not.toContain('average');
    });
  });
});
