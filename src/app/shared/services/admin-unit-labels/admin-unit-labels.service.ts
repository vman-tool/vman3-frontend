import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { ExpectedDeathsNode } from 'app/modules/settings/interface';

// Friendly display names for raw administrative-unit codes (e.g. an ODK
// region/district/ward value like "Ilala_Municipal_Council"), sourced from
// the expected_deaths admin hierarchy (Settings > Configuration > Data
// Dictionary > Expected Number of Deaths) - the same xForm choices-sheet
// upload that already carries a human-readable `label` for every such code.
// This replaced the old, separately hand-typed "Re-label Access Fields"
// aliases, which duplicated the same value -> label mapping this module
// already has for free.
@Injectable({ providedIn: 'root' })
export class AdminUnitLabelsService {
  private labelByValue: Map<string, string> | null = null;
  // Same map, keyed lower-cased - some callers' raw values come back
  // lower-cased at the source (e.g. ccva_results' locationLevel1/2/3, built
  // via an AQL LOWER(doc.field)), which would otherwise never match the
  // expected_deaths tree's own mixed-case value ("Pwani", not "pwani").
  private labelByValueLower: Map<string, string> | null = null;
  private loading$: Observable<Map<string, string>> | null = null;

  constructor(private settingConfigService: SettingConfigService) {}

  /** Loads (and caches) the full value -> label map. Safe to call repeatedly -
   * concurrent callers share the one in-flight request. */
  load(): Observable<Map<string, string>> {
    if (this.labelByValue) return of(this.labelByValue);
    if (this.loading$) return this.loading$;

    this.loading$ = this.settingConfigService.getExpectedDeaths().pipe(
      map((res: any) => {
        const byValue = new Map<string, string>();
        const byValueLower = new Map<string, string>();
        const flatten = (nodes: ExpectedDeathsNode[] | undefined) => {
          for (const node of nodes || []) {
            byValue.set(node.value, node.label);
            byValueLower.set(node.value.toLowerCase(), node.label);
            flatten(node.children);
          }
        };
        flatten(res?.data?.tree ?? []);
        this.labelByValue = byValue;
        this.labelByValueLower = byValueLower;
        return byValue;
      }),
      shareReplay(1)
    );
    return this.loading$;
  }

  /** Friendly label for a raw code, already loaded. Falls back to whatever
   * `fallback` is given, or the raw value itself, when nothing is found -
   * e.g. no expected_deaths data has been imported yet, or this particular
   * code isn't one of its administrative units. Matches case-insensitively
   * as a fallback after an exact match, since not every caller's raw value
   * is cased the same as the expected_deaths tree's own value. */
  friendlyLabel(rawValue: string | null | undefined, fallback?: string): string {
    const fallbackValue = fallback ?? rawValue ?? '';
    if (!rawValue) return fallbackValue;
    return (
      this.labelByValue?.get(rawValue) ??
      this.labelByValueLower?.get(rawValue.toLowerCase()) ??
      fallbackValue
    );
  }

  clearCache(): void {
    this.labelByValue = null;
    this.labelByValueLower = null;
    this.loading$ = null;
  }
}
