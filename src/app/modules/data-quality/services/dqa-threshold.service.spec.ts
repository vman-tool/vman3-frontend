import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DqaThresholdService } from './dqa-threshold.service';
import { SettingConfigService } from '../../settings/services/settings_configs.service';

describe('DqaThresholdService', () => {
  let service: DqaThresholdService;

  beforeEach(() => {
    const settingConfigServiceStub = {
      getSettingsConfig: () => of(null),
    };

    TestBed.configureTestingModule({
      providers: [
        DqaThresholdService,
        { provide: SettingConfigService, useValue: settingConfigServiceStub },
      ],
    });

    service = TestBed.inject(DqaThresholdService);
  });

  describe('colorFor - ordered-severity indicators (rrs/ics/ici)', () => {
    it('returns the top tier label/color at or above the high threshold', () => {
      // Default RRS thresholds: high=80, mid=50; tier1="Excellent"/green.
      expect(service.colorFor('rrs', 85)).toEqual({ label: 'Excellent', colorHex: '#10b981' });
    });

    it('returns the mid tier between the mid and high thresholds', () => {
      expect(service.colorFor('rrs', 60)).toEqual({ label: 'Good', colorHex: '#fbbf24' });
    });

    it('returns the bottom tier below the mid threshold', () => {
      expect(service.colorFor('rrs', 10)).toEqual({ label: 'Critical', colorHex: '#ef4444' });
    });

    it('returns null for a null/undefined value, never a color', () => {
      expect(service.colorFor('ics', null)).toBeNull();
      expect(service.colorFor('ici', undefined as any)).toBeNull();
    });
  });

  describe('colorFor - aid (Too Short / Normal / Too Long)', () => {
    // AID's own map palette (amber/green/red) is used here regardless of
    // the admin-configured badge color - see AID_MAP_COLORS: the default
    // assigns 'red' to BOTH tier_short and tier_long, which would make 2 of
    // these 3 map colors collide if colorFor used that field directly
    // instead of its own fixed palette (tier_normal's own default is now
    // 'green', same as the map's, but an admin could still repoint it to
    // 'red' or 'none' without the map losing its 3 distinct colors).
    it('flags a too-short interview distinctly from too-long (amber, not red)', () => {
      expect(service.colorFor('aid', 10)).toEqual({ label: 'Too Short', colorHex: '#f59e0b' });
    });

    it('colors a normal-length interview distinctly from Unclassified (green, not gray)', () => {
      // The map always needs a color for every point regardless of the
      // admin-configured badge color (colorFor never returns null here),
      // so this stays true even for a deployment that sets tier_normal's
      // own color to 'none' or something else.
      expect(service.colorFor('aid', 45)).toEqual({ label: 'Normal', colorHex: '#10b981' });
    });

    it('flags a too-long interview', () => {
      expect(service.colorFor('aid', 90)).toEqual({ label: 'Too Long', colorHex: '#ef4444' });
    });
  });

  describe('legendFor', () => {
    it('returns the 3 fixed tier label/color pairs for an ordered-severity indicator', () => {
      expect(service.legendFor('ics')).toEqual([
        { label: 'Excellent', colorHex: '#10b981' },
        { label: 'Good', colorHex: '#fbbf24' },
        { label: 'Critical', colorHex: '#ef4444' },
      ]);
    });

    it('returns Too Short/Normal/Too Long in that order for aid, all 3 mutually distinct', () => {
      const legend = service.legendFor('aid');
      expect(legend).toEqual([
        { label: 'Too Short', colorHex: '#f59e0b' },
        { label: 'Normal', colorHex: '#10b981' },
        { label: 'Too Long', colorHex: '#ef4444' },
      ]);
      expect(new Set(legend.map(e => e.colorHex)).size).toBe(3);
    });
  });

  describe('classifyAid', () => {
    it('flags a too-short interview with a badge', () => {
      expect(service.classifyAid(10)?.label).toBe('Too Short');
    });

    it('a normal-length interview gets a real (green) badge by default, not no badge at all', () => {
      // Regression: tier_normal's default color used to be 'none', which
      // made classifyAid() return null for a perfectly normal duration -
      // the dashboard then showed "No Data" for it (the same fallback used
      // for a row with nothing computed at all), which read as if the
      // duration couldn't be classified rather than "this is fine". The
      // default is now 'green', so a normal duration gets its own visible
      // "Normal" badge, the same way RRS/ICS/ICI's own best tier does.
      const badge = service.classifyAid(45);
      expect(badge).not.toBeNull();
      expect(badge?.label).toBe('Normal');
      expect(badge?.bgClass).toBe('bg-emerald-500');
    });

    it('flags a too-long interview with a badge', () => {
      expect(service.classifyAid(90)?.label).toBe('Too Long');
    });

    it('returns null for a null/undefined value, never a badge', () => {
      expect(service.classifyAid(null)).toBeNull();
      expect(service.classifyAid(undefined as any)).toBeNull();
    });
  });

  it('picks up an admin-configured threshold change without a full reload', () => {
    (service as any).subj.next({
      ...service.current,
      rrs: {
        threshold_high: 80, threshold_mid: 50,
        tier1: { label: 'Custom High', color: 'amber' },
        tier2: { label: 'Good', color: 'amber' },
        tier3: { label: 'Critical', color: 'red' },
      },
    });

    expect(service.colorFor('rrs', 90)).toEqual({ label: 'Custom High', colorHex: '#fbbf24' });
  });
});
