import { FieldLabel, FieldMapping, SystemConfig, SystemImages } from '../../interface';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConnectionFormComponent } from '../../dialogs/connection-form/connection-form.component';
import { OdkConfigModel, settingsConfigData } from '../../interface';
import { SettingConfigService } from '../../services/settings_configs.service';
import { SettingsConfigsFormComponent } from '../../dialogs/settings-configs-form/settings-configs-form.component';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { lastValueFrom } from 'rxjs';
import { AuthService } from 'app/core/services/authentication/auth.service';
import * as privileges from 'app/shared/constants/privileges.constants';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { DataSyncService } from '../../services/data_sync.service';
import { OBJECTKEY_ODK_QUESTIONS } from 'app/shared/constants/odk.constants';
import { map } from 'rxjs';


@Component({
  standalone: false,
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss'],
})
export class ConfigurationComponent {
  isLoading = true; // Add isLoading state
  hasOdkApiData = false;
  odkApiData: OdkConfigModel | undefined;
  systemConfigData: SystemConfig | undefined;
  fieldMappingData: FieldMapping | undefined;
  vaSummaryData: string[] = [];

  dataAccess?: any;

  selectedTab = 'system-config'; // Default selected tab
  vaSummaryObjects?: any;
  fieldLabels: FieldLabel[] | undefined;

  // Questions Sync Properties
  syncedQuestions?: any[] = [];
  forceChecked: boolean = false;
  isQuestionsSyncing: boolean = false;
  isQuestionsSyncTabLoading: boolean = false;

  // Data Dictionary sub-tabs: 'xform' (upload) | 'server' (ODK sync)
  dictionaryTab: 'xform' | 'server' = 'xform';

  // "Override existing labels" - one per tab, both default off (No).
  // Off: only missing labels/languages are filled. On: incoming values replace
  // what is stored for the languages they carry.
  xformOverrideLabels = false;
  syncOverrideLabels = false;

  // xForm upload
  xformFile: File | null = null;
  xformUploading = false;
  xformUploadSuccess = '';
  xformUploadError = '';

  // Data dictionary table
  dictionaryRows: any[] = [];
  dictionaryLanguages: string[] = [];
  dictionaryLoading = false;
  dictionaryError = '';
  dictionarySearch = '';
  dictionaryPage = 1;
  dictionaryPageSize = 10;
  readonly dictionaryPageSizes = [10, 25, 50, 100];

  /** Language shown in the fixed third column. English when available. */
  get dictionaryPrimaryLanguage(): string {
    if (!this.dictionaryLanguages.length) return '';
    return this.dictionaryLanguages.includes('English') ? 'English' : this.dictionaryLanguages[0];
  }

  /** Everything the fourth (selectable) column can show. */
  get dictionaryOtherLanguages(): string[] {
    return this.dictionaryLanguages.filter(l => l !== this.dictionaryPrimaryLanguage);
  }

  /** Currently chosen language for the fourth column. */
  dictionarySecondLanguage = '';

  /** Shape the language list for <app-custom-dropdown>. */
  get dictionaryLanguageOptions(): { value: string; label: string }[] {
    return this.dictionaryOtherLanguages.map(l => ({ value: l, label: l }));
  }

  // ── Inline label editing ───────────────────────────────────────────────────
  // Identified by "<question name>|<language>" so the same question can be
  // edited in either language column without ambiguity.
  editingCell: string | null = null;
  editingText = '';
  editingSaving = false;
  editingError = '';

  private cellKey(name: string, language: string): string { return `${name}|${language}`; }

  isEditing(name: string, language: string): boolean {
    return this.editingCell === this.cellKey(name, language);
  }

  startEditLabel(row: any, language: string): void {
    this.editingCell = this.cellKey(row.name, language);
    this.editingText = (row.labels && row.labels[language]) || '';
    this.editingError = '';
  }

  cancelEditLabel(): void {
    this.editingCell = null;
    this.editingText = '';
    this.editingError = '';
  }

  saveEditLabel(row: any, language: string): void {
    const text = (this.editingText || '').trim();
    if (!text) { this.editingError = 'The label cannot be empty.'; return; }

    // Nothing changed - close without a round trip
    if (text === ((row.labels && row.labels[language]) || '')) { this.cancelEditLabel(); return; }

    this.editingSaving = true;
    this.settingConfigService.updateDictionaryLabel(row.name, language, text).subscribe({
      next: (res: any) => {
        // Patch the row in place so the table does not have to reload
        row.labels = res?.data?.labels ?? { ...(row.labels || {}), [language]: text };
        if (language === this.dictionaryPrimaryLanguage) row.label = text;
        this.editingSaving = false;
        this.cancelEditLabel();
      },
      error: (err: any) => {
        this.editingError = err?.error?.detail ?? 'Could not save the label.';
        this.editingSaving = false;
      },
    });
  }

  /** Columns rendered: Variable, Type, primary, and the selectable one if any. */
  get dictionaryColumnCount(): number {
    return this.dictionaryLanguages.length
      ? 3 + (this.dictionaryOtherLanguages.length ? 1 : 0)
      : 3;
  }

  /** Name or any label matches the search box. */
  get filteredDictionary(): any[] {
    const term = this.dictionarySearch.trim().toLowerCase();
    if (!term) return this.dictionaryRows;
    return this.dictionaryRows.filter(r =>
      (r.name ?? '').toLowerCase().includes(term) ||
      Object.values(r.labels ?? {}).some((v: any) => String(v).toLowerCase().includes(term)) ||
      (r.label ?? '').toLowerCase().includes(term)
    );
  }

  get dictionaryTotal(): number { return this.filteredDictionary.length; }

  get dictionaryTotalPages(): number {
    return Math.max(1, Math.ceil(this.dictionaryTotal / this.dictionaryPageSize));
  }

  get pagedDictionary(): any[] {
    const start = (this.dictionaryPage - 1) * this.dictionaryPageSize;
    return this.filteredDictionary.slice(start, start + this.dictionaryPageSize);
  }

  get dictRangeStart(): number {
    return this.dictionaryTotal === 0 ? 0 : (this.dictionaryPage - 1) * this.dictionaryPageSize + 1;
  }

  get dictRangeEnd(): number {
    return Math.min(this.dictionaryPage * this.dictionaryPageSize, this.dictionaryTotal);
  }

  get hasDictPrev(): boolean { return this.dictionaryPage > 1; }
  get hasDictNext(): boolean { return this.dictionaryPage < this.dictionaryTotalPages; }

  dictPrevPage(): void { if (this.hasDictPrev) this.dictionaryPage--; }
  dictNextPage(): void { if (this.hasDictNext) this.dictionaryPage++; }

  /** Searching or resizing must return to page 1, or the view can land out of range. */
  onDictionarySearchChange(): void { this.dictionaryPage = 1; }

  onDictionaryPageSizeChange(size: any): void {
    this.dictionaryPageSize = Number(size) || 10;
    this.dictionaryPage = 1;
  }

  // VMan ML Model Properties
  mlModelInfo: any = null;
  mlModelLoading = false;
  mlModelError = '';
  mlUploadFile: File | null = null;
  mlUploadVersion = '';
  mlUploadNotes = '';
  mlUploadAccuracy: number | null = null;
  mlUploadF1Macro: number | null = null;
  mlUploadF1Weighted: number | null = null;
  mlUploadCvF1Macro: number | null = null;
  mlUploadNTraining: number | null = null;
  mlUploadNTest: number | null = null;
  mlUploading = false;
  mlUploadSuccess = '';
  mlUploadError = '';

  // Cache state to prevent unnecessary reloads
  private dataLoaded = false;

  constructor(
    public dialog: MatDialog,
    private settingConfigService: SettingConfigService,
    private indexedDBService: IndexedDBService,
    private genericIndexedDbService: GenericIndexedDbService,
    private authService: AuthService,
    private vaRecordsService: VaRecordsService,
    private dataSyncService: DataSyncService,
  ) { }

  async hasAccess(privileges: string[]) {
    return await lastValueFrom(this.authService.hasPrivilege(privileges));
  }

  async ngOnInit(): Promise<void> {
    // Only load data if not already loaded
    if (!this.dataLoaded) {
      this.loadOdkApiData();
    }

    this.dataAccess = {
      addSystemConfigs: await this.hasAccess([privileges.SETTINGS_CREATE_SYSTEM_CONFIGS]),
      updateSystemConfigs: await this.hasAccess([privileges.SETTINGS_UPDATE_SYSTEM_CONFIGS]),
      viewSystemConfigs: await this.hasAccess([privileges.SETTINGS_VIEW_SYSTEM_CONFIGS]),
      addODKSettings: await this.hasAccess([privileges.SETTINGS_CREATE_ODK_DETAILS]),
      updateODKSettings: await this.hasAccess([privileges.SETTINGS_UPDATE_ODK_DETAILS]),
      viewODKSettings: await this.hasAccess([privileges.SETTINGS_VIEW_ODK_DETAILS]),
      addFieldMapping: await this.hasAccess([privileges.SETTINGS_CREATE_FIELD_MAPPING]),
      updateFieldMapping: await this.hasAccess([privileges.SETTINGS_UPDATE_FIELD_MAPPING]),
      viewFieldMapping: await this.hasAccess([privileges.SETTINGS_VIEW_FIELD_MAPPING]),
      addSummaryFields: await this.hasAccess([privileges.SETTINGS_CREATE_VA_SUMMARY]),
      updateSummaryFields: await this.hasAccess([privileges.SETTINGS_UPDATE_VA_SUMMARY]),
      viewSummaryFields: await this.hasAccess([privileges.SETTINGS_VIEW_VA_SUMMARY]),
      updateSystemImages: await this.hasAccess([privileges.SETTINGS_UPDATE_SYSTEM_IMAGES]),
      updateAccessLocationsLabels: await this.hasAccess([privileges.USERS_UPDATE_ACCESS_LIMIT_LABELS]),
      canSyncODKQuestions: await this.hasAccess([privileges.ODK_QUESTIONS_SYNC]),

    }
  }

  loadOdkApiData(): void {
    this.isLoading = true; // Start isLoading
    this.settingConfigService.getSettingsConfig().subscribe({
      next: async (data: settingsConfigData | null) => {
        this.hasOdkApiData = !!data;
        if (this.hasOdkApiData && data) {
          this.odkApiData = data.odk_api_configs;
          this.systemConfigData = data?.system_configs;
          this.fieldMappingData = data?.field_mapping;
          this.vaSummaryData = data?.va_summary;
          this.fieldLabels = data?.field_labels;
          this.vaSummaryObjects =
            data?.va_summary && data?.va_summary !== null
              // ? await this.indexedDBService.getQuestionsByKeys(data?.va_summary)
              ? await this.genericIndexedDbService.getDataByKeys(OBJECTSTORE_VA_QUESTIONS, data?.va_summary)
              : [];
        }
        this.isLoading = false; // Stop isLoading
        this.dataLoaded = true; // Mark data as loaded
      },
      error: (error) => {
        console.error('Failed to load ODK API data:', error);
        this.isLoading = false; // Stop isLoading even on error
      },
    });
  }

  editOdkApi(): void {
    const dialogRef = this.dialog.open(ConnectionFormComponent, {
      width: '700px',
      data: this.odkApiData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.odkApiData = result;
        this.hasOdkApiData = true;
        this.refreshData();
      }
    });
  }

  // Method to force refresh data
  refreshData(): void {
    this.dataLoaded = false;
    this.settingConfigService.clearCache();
    this.loadOdkApiData();
  }

  editForm(
    type: 'odk_api_configs' | 'system_configs' | 'field_mapping' | 'va_summary'
  ): void {
    const data =
      type === 'va_summary'
        ? { va_summary: this.vaSummaryData }
        : this.odkApiData;
    const dialogRef = this.dialog.open(SettingsConfigsFormComponent, {
      width: type === 'field_mapping' ? '40%' : '50%',
      data: {
        type: type,
        ...data,
      },
      maxHeight: '98vh',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        if (type === 'va_summary') {
          this.vaSummaryData = result;
          // this.vaSummaryObjects = await this.indexedDBService.getQuestionsByKeys(result);
          this.vaSummaryObjects = await this.genericIndexedDbService.getDataByKeys(OBJECTSTORE_VA_QUESTIONS, result);
        }

        this.odkApiData = result;
        this.hasOdkApiData = true;
        this.refreshData();
      }
    });
  }

  addOdkApi(): void {
    this.editOdkApi();
  }

  onLoadLabelAccess() {
    this.selectedTab = "";

    this.refreshData();

    this.selectedTab = "label-access-fields";

  }

  // Question Sync Methods

  loadQuestionsSyncTab() {
    console.log('Loading Questions Synchronization tab...');
    this.isQuestionsSyncTabLoading = true;
    this.loadDataDictionary();

    // Load questions data
    this.loadQuestions().then(() => {
      this.isQuestionsSyncTabLoading = false;
      console.log('Questions Synchronization tab loaded');
    }).catch((error) => {
      console.error('Error loading questions tab:', error);
      this.isQuestionsSyncTabLoading = false;
    });
  }

  private async loadQuestions(): Promise<void> {
    try {
      // Load questions from IndexedDB or API
      this.syncedQuestions = await this.genericIndexedDbService.getData(
        OBJECTSTORE_VA_QUESTIONS
      );

      // If no questions found, try to sync them
      if (!this.syncedQuestions?.length) {
        await this.syncQuestionsIfNeeded();
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      throw error;
    }
  }

  async syncQuestionsIfNeeded() {
    this.isQuestionsSyncing = true;

    // this.syncedQuestions = await this.indexedDBService.getQuestions();
    this.syncedQuestions = await this.genericIndexedDbService.getData(
      OBJECTSTORE_VA_QUESTIONS
    );

    if (!this.syncedQuestions?.length) {
      console.log('No synced questions found, starting sync...');
      this.syncedQuestions = await lastValueFrom(
        this.vaRecordsService.getQuestions().pipe(
          map(async (response: any) => {
            if (response?.data) {
              // await this.indexedDBService.addQuestions(response?.data);
              // await this.indexedDBService.addQuestionsAsObject(response?.data);

              await this.genericIndexedDbService.addDataAsObjectValues(
                OBJECTSTORE_VA_QUESTIONS,
                response?.data
              );
              await this.genericIndexedDbService.addDataAsIs(
                OBJECTSTORE_VA_QUESTIONS,
                OBJECTKEY_ODK_QUESTIONS,
                response?.data
              );

              // Sync status will be updated automatically by backend - no manual update needed

              // return await this.indexedDBService.getQuestions();
              return await this.genericIndexedDbService.getData(
                OBJECTSTORE_VA_QUESTIONS
              );
            }
          })
        )
      );
    }

    if (!this.syncedQuestions) {
      console.error('Failed to sync questions.');
    } else {
      console.log(`${this.syncedQuestions.length} questions synced.`);
    }

    this.isQuestionsSyncing = false;
  }

  async onSyncQuestions() {
    this.isQuestionsSyncing = true;
    this.syncedQuestions = undefined;

    if (!this.forceChecked) {
      this.syncedQuestions = await lastValueFrom(
        this.vaRecordsService.getQuestions().pipe(
          map(async (response: any) => {
            if (response?.data) {
              // await this.indexedDBService.addQuestions(response?.data);
              // return await this.indexedDBService.getQuestions();

              await this.genericIndexedDbService.addDataAsObjectValues(
                OBJECTSTORE_VA_QUESTIONS,
                response?.data
              );
              await this.genericIndexedDbService.addDataAsIs(
                OBJECTSTORE_VA_QUESTIONS,
                OBJECTKEY_ODK_QUESTIONS,
                response?.data
              );

              return await this.genericIndexedDbService.getData(
                OBJECTSTORE_VA_QUESTIONS
              );
            }
          })
        )
      );
    }

    if (!this.syncedQuestions) {
      this.syncedQuestions = await lastValueFrom(
        this.dataSyncService.syncQuestions(this.syncOverrideLabels).pipe(
          map(async (response: any) => {
            // await this.indexedDBService.addQuestions(response?.data);
            // this.forceChecked = !this.forceChecked;
            // return await this.indexedDBService.getQuestions();

            await this.genericIndexedDbService.addDataAsObjectValues(
              OBJECTSTORE_VA_QUESTIONS,
              response?.data
            );
            await this.genericIndexedDbService.addDataAsIs(
              OBJECTSTORE_VA_QUESTIONS,
              OBJECTKEY_ODK_QUESTIONS,
              response?.data
            );

            this.forceChecked = !this.forceChecked;

            // Sync status will be updated automatically by backend - no manual update needed

            return await this.genericIndexedDbService.getData(
              OBJECTSTORE_VA_QUESTIONS
            );
          })
        )
      );
    }

    this.isQuestionsSyncing = false;
  }

  onForceCheck(event: any, isChecked: boolean) {
    this.forceChecked = event.target.checked;
  }

  // ── VMan ML Model methods ──────────────────────────────────────────────────

  loadMlModelInfo(): void {
    this.mlModelLoading = true;
    this.mlModelError = '';
    this.settingConfigService.getMlModelInfo().subscribe({
      next: (res: any) => {
        this.mlModelInfo = res?.data ?? null;
        this.mlModelLoading = false;
      },
      error: () => {
        this.mlModelError = 'Failed to load model information.';
        this.mlModelLoading = false;
      },
    });
  }

  onXformFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.xformUploadSuccess = '';
    this.xformUploadError = '';

    if (file && !/\.(xlsx|xls)$/i.test(file.name)) {
      this.xformFile = null;
      this.xformUploadError = 'An xForm must be an XLSForm workbook (.xlsx or .xls).';
      input.value = '';
      return;
    }
    this.xformFile = file;
  }

  clearXformFile(): void {
    this.xformFile = null;
    this.xformUploadSuccess = '';
    this.xformUploadError = '';
  }

  loadDataDictionary(): void {
    this.dictionaryLoading = true;
    this.dictionaryError = '';
    this.settingConfigService.getDataDictionary().subscribe({
      next: (res: any) => {
        this.dictionaryRows = res?.data?.questions ?? [];
        this.dictionaryLanguages = res?.data?.languages ?? [];
        // Keep the chosen second language if it still exists after a refresh,
        // otherwise fall back to the first available one.
        const others = this.dictionaryOtherLanguages;
        if (!others.includes(this.dictionarySecondLanguage)) {
          this.dictionarySecondLanguage = others[0] ?? '';
        }
        this.dictionaryLoading = false;
      },
      error: () => {
        this.dictionaryError = 'Could not load the data dictionary.';
        this.dictionaryLoading = false;
      },
    });
  }

  uploadXform(): void {
    if (!this.xformFile) {
      this.xformUploadError = 'Please select an xForm workbook first.';
      return;
    }

    const form = new FormData();
    form.append('file', this.xformFile);
    form.append('override_labels', String(this.xformOverrideLabels));

    this.xformUploading = true;
    this.xformUploadSuccess = '';
    this.xformUploadError = '';

    this.settingConfigService.uploadXform(form).subscribe({
      next: (res: any) => {
        const d = res?.data ?? {};
        this.xformUploadSuccess = res?.message ?? 'xForm uploaded successfully.';
        if (d.unmatched_count) {
          this.xformUploadSuccess +=
            ` ${d.unmatched_count} question(s) in the xForm are not in the dictionary and were skipped.`;
        }
        this.xformUploading = false;
        this.xformFile = null;
        // Refresh so the enriched labels/languages are visible immediately
        this.loadQuestionsSyncTab();
        this.loadDataDictionary();
      },
      error: (err: any) => {
        this.xformUploadError =
          err?.error?.detail ?? err?.error?.message ?? 'Upload failed. Please check the file and try again.';
        this.xformUploading = false;
      },
    });
  }

  onMlFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mlUploadFile = input.files?.[0] ?? null;
    this.mlUploadSuccess = '';
    this.mlUploadError = '';
  }

  uploadMlModel(): void {
    if (!this.mlUploadFile) { this.mlUploadError = 'Please select a .pkl file.'; return; }
    if (!this.mlUploadVersion.trim()) { this.mlUploadError = 'Version is required.'; return; }
    if (this.mlUploadAccuracy === null || this.mlUploadF1Macro === null ||
        this.mlUploadF1Weighted === null || this.mlUploadNTraining === null || this.mlUploadNTest === null) {
      this.mlUploadError = 'All metric fields are required.'; return;
    }

    const form = new FormData();
    form.append('file', this.mlUploadFile);
    form.append('version', this.mlUploadVersion.trim());
    form.append('notes', this.mlUploadNotes.trim());
    form.append('accuracy', String(this.mlUploadAccuracy));
    form.append('f1_macro', String(this.mlUploadF1Macro));
    form.append('f1_weighted', String(this.mlUploadF1Weighted));
    form.append('n_training_samples', String(this.mlUploadNTraining));
    form.append('n_test_samples', String(this.mlUploadNTest));
    if (this.mlUploadCvF1Macro !== null) {
      form.append('cv_f1_macro', String(this.mlUploadCvF1Macro));
    }

    this.mlUploading = true;
    this.mlUploadSuccess = '';
    this.mlUploadError = '';

    this.settingConfigService.uploadMlModel(form).subscribe({
      next: (res: any) => {
        this.mlModelInfo = res?.data ?? this.mlModelInfo;
        this.mlUploadSuccess = `Model v${this.mlUploadVersion} uploaded successfully.`;
        this.mlUploadFile = null;
        this.mlUploadVersion = '';
        this.mlUploadNotes = '';
        this.mlUploadAccuracy = null;
        this.mlUploadF1Macro = null;
        this.mlUploadF1Weighted = null;
        this.mlUploadCvF1Macro = null;
        this.mlUploadNTraining = null;
        this.mlUploadNTest = null;
        this.mlUploading = false;
      },
      error: (err: any) => {
        this.mlUploadError = err?.error?.detail ?? 'Upload failed. Please try again.';
        this.mlUploading = false;
      },
    });
  }

  fmtPct(v: number | null | undefined): string {
    if (v == null) return '—';
    return (v * 100).toFixed(1) + '%';
  }
}
