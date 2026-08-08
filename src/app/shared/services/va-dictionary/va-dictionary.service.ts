import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';

/** The language every deployment is guaranteed to have, and the default. */
export const DEFAULT_VA_LANGUAGE = 'English';

/** A choice from a question's option list, with its text in every language. */
export interface DictionaryOption {
  value: string;
  label: string;
  labels?: { [language: string]: string };
}

/** What the dictionary knows about one question, merged from all sources. */
export interface QuestionDefinition {
  name: string;
  label: string;
  labels: { [language: string]: string };
  optionsByValue: Map<string, DictionaryOption>;
  hasOptions: boolean;
}

/**
 * One answered field of a submission, ready to render.
 *
 * `label` and `response` are resolved strings rather than getters on purpose:
 * a VA carries several hundred fields, and resolving each one on every
 * change-detection pass is what made the original viewer sluggish. They are
 * rebuilt only when the language changes.
 */
export interface VaField {
  name: string;
  label: string;
  response: string;
  searchKey: string;
}

/**
 * The VA data dictionary, resolved into a form the viewers can render.
 *
 * Holds no component state - the same instance is shared by every dialog that
 * displays a submission, and each one asks it for the fields of its own record
 * in whichever language the user picked.
 */
export class VaDictionary {
  constructor(
    /** Every language present, English first when it exists. */
    readonly languages: string[],
    /** Question names in form order, which the dictionary itself does not keep. */
    private readonly order: string[],
    private readonly definitions: Map<string, QuestionDefinition>
  ) {}

  get isEmpty(): boolean {
    return this.definitions.size === 0;
  }

  get hasLanguageChoice(): boolean {
    return this.languages.length > 1;
  }

  /** Dropdown-ready form of `languages`. */
  get languageOptions(): { value: string; label: string }[] {
    return this.languages.map(language => ({ value: language, label: language }));
  }

  /** Pick a usable language, falling back when the requested one is absent. */
  resolveLanguage(requested?: string): string {
    if (requested && this.languages.includes(requested)) { return requested; }
    return this.languages[0] ?? DEFAULT_VA_LANGUAGE;
  }

  /** Every answered field of `record`, in form order, rendered in `language`. */
  buildFields(record: any, language: string): VaField[] {
    if (!record) { return []; }

    const fields: VaField[] = [];
    for (const name of this.order) {
      const value = record[name];
      if (value === undefined || value === null || value === '') { continue; }

      const definition = this.definitions.get(name);
      const label = this.labelFor(name, language, definition);
      const response = this.responseFor(value, language, definition);

      fields.push({
        name,
        label,
        response,
        searchKey: `${name} ${label} ${response}`.toLowerCase(),
      });
    }
    return fields;
  }

  /** Selected language, then English, then whatever the question has. */
  private labelFor(name: string, language: string, definition?: QuestionDefinition): string {
    if (!definition) { return name; }
    return definition.labels?.[language]
      || definition.labels?.[DEFAULT_VA_LANGUAGE]
      || definition.label
      || name;
  }

  /**
   * Turn a stored answer into readable text.
   *
   * `select_multiple` answers arrive as space-separated codes, so each token is
   * translated on its own and rejoined; a token that is not a known code is
   * shown as stored rather than dropped.
   */
  private responseFor(value: any, language: string, definition?: QuestionDefinition): string {
    if (!definition?.hasOptions) { return String(value); }

    const raw = String(value).trim();
    const direct = definition.optionsByValue.get(raw);
    if (direct) { return this.optionText(direct, language); }

    if (raw.includes(' ')) {
      return raw
        .split(/\s+/)
        .map(token => {
          const option = definition.optionsByValue.get(token);
          return option ? this.optionText(option, language) : token;
        })
        .join(', ');
    }

    return raw;
  }

  private optionText(option: DictionaryOption, language: string): string {
    return option.labels?.[language]
      || option.labels?.[DEFAULT_VA_LANGUAGE]
      || option.label
      || option.value;
  }
}

/**
 * Loads the VA data dictionary once per session and shares it.
 *
 * The labels come from the API rather than the cached IndexedDB questions,
 * because that cache is only ever filled when it is empty (see
 * SidebarComponent) - a browser that cached questions before multi-language
 * support existed would otherwise never see the extra languages. The cached
 * copy is still used, for the question ordering, which follows the form rather
 * than the alphabet.
 */
@Injectable({ providedIn: 'root' })
export class VaDictionaryService {
  private pending?: Promise<VaDictionary>;

  constructor(
    private genericIndexedDbService: GenericIndexedDbService,
    private settingConfigService: SettingConfigService
  ) {}

  /**
   * @param refresh re-read the dictionary instead of using the shared copy.
   *   Wanted after an xForm upload or a question sync, not when merely opening
   *   another record.
   */
  load(refresh: boolean = false): Promise<VaDictionary> {
    if (refresh || !this.pending) {
      this.pending = this.build().catch(error => {
        // Never cache a failure - the next dialog should be able to retry.
        this.pending = undefined;
        throw error;
      });
    }
    return this.pending;
  }

  /** Drop the shared copy so the next viewer reloads it. */
  clear(): void {
    this.pending = undefined;
  }

  private async build(): Promise<VaDictionary> {
    const [cachedQuestions, dictionary] = await Promise.all([
      this.fetchCachedQuestions(),
      this.fetchDictionary(),
    ]);

    const definitions = new Map<string, QuestionDefinition>();
    const order: string[] = [];

    for (const entry of cachedQuestions) {
      const name = entry?.key;
      if (!name || name === 'deviceid') { continue; }
      order.push(name);
      definitions.set(name, this.toDefinition(name, entry?.value));
    }

    // The dictionary is fetched fresh, so where both describe a question it
    // wins; questions it alone knows about are appended.
    for (const question of dictionary?.questions ?? []) {
      const name = question?.name;
      if (!name || name === 'deviceid') { continue; }
      if (!definitions.has(name)) { order.push(name); }
      definitions.set(name, this.toDefinition(name, question));
    }

    return new VaDictionary(
      this.collectLanguages(dictionary?.languages ?? [], definitions),
      order,
      definitions
    );
  }

  private toDefinition(name: string, source: any): QuestionDefinition {
    const optionsByValue = new Map<string, DictionaryOption>();
    for (const option of source?.options ?? []) {
      if (option?.value === undefined || option?.value === null) { continue; }
      optionsByValue.set(String(option.value), option);
    }
    return {
      name,
      label: source?.label || name,
      labels: source?.labels ?? {},
      optionsByValue,
      hasOptions: optionsByValue.size > 0,
    };
  }

  /** Every language the dictionary reports, plus any the questions carry. */
  private collectLanguages(
    reported: string[],
    definitions: Map<string, QuestionDefinition>
  ): string[] {
    const found = new Set<string>(reported ?? []);
    definitions.forEach(definition => {
      Object.keys(definition.labels).forEach(language => found.add(language));
    });

    return Array.from(found).sort((a, b) => {
      if (a === DEFAULT_VA_LANGUAGE) { return -1; }
      if (b === DEFAULT_VA_LANGUAGE) { return 1; }
      return a.localeCompare(b);
    });
  }

  private async fetchCachedQuestions(): Promise<any[]> {
    try {
      return (await this.genericIndexedDbService.getData(OBJECTSTORE_VA_QUESTIONS)) ?? [];
    } catch {
      return [];
    }
  }

  private async fetchDictionary(): Promise<any> {
    try {
      const response: any = await firstValueFrom(
        this.settingConfigService.getDataDictionary(true)
      );
      return response?.data ?? null;
    } catch {
      // A missing dictionary is not fatal - the cached questions still carry
      // the primary language, so the viewer degrades to English only.
      return null;
    }
  }
}
