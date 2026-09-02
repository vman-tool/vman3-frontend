import { AfterViewInit, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VaRecordsService } from '../../../modules/pcva/services/va-records/va-records.service';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { filter_keys_without_data } from 'app/shared/helpers/odk_data.helpers';
import { settingsConfigData, VaSummaryCodOptions } from 'app/modules/settings/interface';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { ListRecordsService } from 'app/modules/records/services/list-records/list-records.service';
import {
  DEFAULT_VA_LANGUAGE,
  VaDictionary,
  VaDictionaryService,
  VaField,
} from 'app/shared/services/va-dictionary/va-dictionary.service';

interface CcvaCod {
  algorithm: string;
  cause1: string | null;
  probability: number | null;
}

interface PcvaCoderCod {
  coder: string;
  coded_at: string | null;
  underlying_cause: string | null;
}

interface PcvaCod {
  coders: PcvaCoderCod[];
  concordance: {
    reached: boolean;
    underlying_cause: string | null;
    agreeing_coders: number;
    total_coders: number;
    concordance_level: number;
  };
}

@Component({
  standalone: false,
  selector: 'app-view-va',
  templateUrl: './view-va.component.html',
  styleUrl: './view-va.component.scss',
})
export class ViewVaComponent implements OnInit, AfterViewInit, OnDestroy {
  /** The submission this dialog was opened for. */
  vaId = '';

  /** The row the records table was showing, for the header strip. */
  context: any;
  contextItems: { label: string; value: any }[] = [];

  loading = true;
  loadError = '';
  questionsMissing = false;

  languageOptions: { value: string; label: string }[] = [];
  hasLanguageChoice = false;
  selectedLanguage = DEFAULT_VA_LANGUAGE;

  fields: VaField[] = [];
  displayFields: VaField[] = [];
  summaryFields: VaField[] = [];

  codOptions: VaSummaryCodOptions = { include_ccva_default: false, include_pcva: false };
  codLoading = false;
  codError = '';
  codData: { ccva: CcvaCod | null; pcva: PcvaCod | null } | null = null;

  searchText = '';

  private record: any = null;
  private dictionary?: VaDictionary;
  private summaryKeys: string[] = [];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<ViewVaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private vaRecordsService: VaRecordsService,
    private vaDictionaryService: VaDictionaryService,
    private settingConfigService: SettingConfigService,
    private listRecordsService: ListRecordsService
  ) {
    // Callers disagree about what they hand over: the VA Records table passes
    // the whole row, while the PCVA tables pass just the id string. Accept
    // either, and only show the context strip when a row was supplied.
    const va = data?.va;
    this.context = va && typeof va === 'object' ? va : {};
    this.vaId = ViewVaComponent.resolveVaId(va);

    this.contextItems = [
      { label: 'Interview day', value: this.context?.interviewDay },
      { label: 'Interviewer', value: this.context?.interviewerName },
      { label: 'Questionnaire', value: this.context?.questionnaireType },
      { label: 'Gender', value: this.context?.gender },
    ].filter(item => !!item.value);
  }

  private static resolveVaId(va: any): string {
    if (!va) { return ''; }
    if (typeof va === 'string') { return va; }
    return va.instanceid || va.vaId || va.instanceId || '';
  }

  trackByName(_index: number, field: VaField): string {
    return field.name;
  }

  ngOnInit(): void {
    this.setupSearch();
    this.load();
  }

  /**
   * Material caps a dialog panel at 80vw, which would override the 95vw the
   * records table asks for. Relax it once the panel exists.
   */
  ngAfterViewInit(): void {
    const panel = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (panel) {
      (panel as HTMLElement).style.maxWidth = '100vw';
      (panel as HTMLElement).style.minWidth = '0';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------- loading

  private async load(): Promise<void> {
    this.loading = true;
    this.loadError = '';

    // Without an id getVARecords asks for every submission, unpaged - the
    // request that made this dialog appear to hang forever when opened from
    // PCVA. Fail fast instead.
    if (!this.vaId) {
      this.loadError = 'This VA record could not be identified, so nothing was loaded.';
      this.loading = false;
      return;
    }

    try {
      const [submission, dictionary] = await Promise.all([
        this.fetchRecord(),
        this.vaDictionaryService.load(),
      ]);

      if (!submission) {
        this.loadError = `No submission was found for ${this.vaId}.`;
        return;
      }

      this.record = submission;
      this.dictionary = dictionary;
      this.questionsMissing = dictionary.isEmpty;
      this.languageOptions = dictionary.languageOptions;
      this.hasLanguageChoice = dictionary.hasLanguageChoice;
      this.selectedLanguage = dictionary.resolveLanguage(this.selectedLanguage);

      await this.loadSummaryKeys();

      this.applyLanguage();

      this.loadCauseOfDeath();
    } catch (error: any) {
      console.error('Failed to load the VA record:', error);
      this.loadError = 'This VA record could not be loaded. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private async fetchRecord(): Promise<any> {
    const response: any = await firstValueFrom(
      this.vaRecordsService.getVARecords(
        undefined, undefined, undefined, undefined, false, this.vaId
      )
    );
    return filter_keys_without_data(response?.data ?? [])?.[0] ?? null;
  }

  private async loadSummaryKeys(): Promise<void> {
    try {
      const config: settingsConfigData | null = await firstValueFrom(
        this.settingConfigService.getSettingsConfig()
      );
      this.summaryKeys = config?.va_summary ?? [];
      this.codOptions = config?.va_summary_cod_options ?? { include_ccva_default: false, include_pcva: false };
    } catch {
      this.summaryKeys = [];
    }
  }

  private loadCauseOfDeath(): void {
    if (!this.codOptions.include_ccva_default && !this.codOptions.include_pcva) {
      return;
    }

    this.codLoading = true;
    this.codError = '';
    this.listRecordsService
      .getCauseOfDeath(this.vaId, this.codOptions.include_ccva_default, this.codOptions.include_pcva)
      .subscribe({
        next: (response: any) => {
          this.codData = response?.data ?? null;
          this.codLoading = false;
        },
        error: () => {
          this.codError = 'Cause of Death could not be loaded.';
          this.codLoading = false;
        },
      });
  }

  // --------------------------------------------------------------- language

  onLanguageChange(language: string): void {
    if (!language || language === this.selectedLanguage) { return; }
    this.selectedLanguage = language;
    this.applyLanguage();
  }

  /** Rebuild every rendered string for the selected language. */
  private applyLanguage(): void {
    this.fields = this.dictionary?.buildFields(this.record, this.selectedLanguage) ?? [];

    const byName = new Map(this.fields.map(field => [field.name, field]));
    this.summaryFields = this.summaryKeys
      .map(key => byName.get(key))
      .filter((field): field is VaField => !!field);

    this.applySearch(this.searchText);
  }

  // ---------------------------------------------------------------- search

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => this.applySearch(term));
  }

  onSearch(): void {
    this.searchSubject.next(this.searchText);
  }

  clearSearch(): void {
    this.searchText = '';
    this.applySearch('');
  }

  private applySearch(term: string): void {
    const needle = (term || '').trim().toLowerCase();
    this.displayFields = needle
      ? this.fields.filter(field => field.searchKey.includes(needle))
      : this.fields;
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
