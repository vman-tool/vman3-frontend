import { FieldLabel, FieldMapping, SystemConfig, SystemImages } from '../../interface';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OdkConfigModel, settingsConfigData } from '../../interface';
import { SettingConfigService } from '../../services/settings_configs.service';
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
  odkApiConfigForm!: FormGroup;
  isSavingOdkConfig = false;
  showOdkPassword = false;
  systemConfigData: SystemConfig | undefined;
  systemConfigForm!: FormGroup;
  isSavingSystemConfig = false;
  fieldMappingData: FieldMapping | undefined;
  fieldMappingForm!: FormGroup;
  vaFieldOptions: any[] = [];
  isSavingFieldMapping = false;
  vaSummaryData: string[] = [];
  isSavingVaSummary = false;

  dataAccess?: any;

  selectedTab = 'system-config'; // Default selected tab
  fieldLabels: FieldLabel[] | undefined;

  // Questions Sync Properties
  syncedQuestions?: any[] = [];
  forceChecked: boolean = false;
  isQuestionsSyncing: boolean = false;
  isQuestionsSyncTabLoading: boolean = false;

  // Data Dictionary sub-tabs: 'xform' (upload) | 'server' (ODK sync)
  dictionaryTab: 'xform' | 'server' = 'server';

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
    private settingConfigService: SettingConfigService,
    private indexedDBService: IndexedDBService,
    private genericIndexedDbService: GenericIndexedDbService,
    private authService: AuthService,
    private vaRecordsService: VaRecordsService,
    private dataSyncService: DataSyncService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
  ) {
    this.odkApiConfigForm = this.fb.group({
      url: ['', [Validators.required, Validators.pattern(/^(https?:\/\/[^\s]+)$/)]],
      username: ['', Validators.required],
      password: ['', Validators.required],
      form_id: ['', Validators.required],
      project_id: ['', Validators.required],
      api_version: ['v1'],
    });

    this.systemConfigForm = this.fb.group({
      app_name: ['', Validators.required],
      page_title: ['', Validators.required],
      page_subtitle: ['', Validators.required],
      admin_level1: ['', Validators.required],
      admin_level2: ['', Validators.required],
      admin_level3: ['', Validators.required],
      // Not every deployment configures a 4th admin level or a map center
      // point - both can be left blank and filled in later.
      admin_level4: [''],
      map_center: [''],
    });

    this.fieldMappingForm = this.fb.group({
      instance_id: ['', Validators.required],
      va_id: ['', Validators.required],
      consent_id: [''],
      location_level1: ['', Validators.required],
      location_level2: [''],
      location_level3: [''],
      location_level4: [''],
      deceased_gender: [''],
      is_adult: ['', Validators.required],
      is_child: ['', Validators.required],
      is_neonate: ['', Validators.required],
      birth_date: [''],
      death_date: [''],
      interview_date: [''],
      submitted_date: [''],
      interviewer_name: ['', Validators.required],
      interviewer_phone: [''],
      interviewer_sex: [''],
    });

    this.refreshVaFieldOptions();
  }

  // vaFieldOptions backs the Field Mapping / VA-Summary search pickers.
  // Previously this only ever ran once, in the constructor - fine when
  // Field Mapping was its own dialog (a fresh component instance, and so a
  // fresh fetch, every time it opened), but now that it lives inline on
  // this page-level component, syncing questions later in the same page
  // session updated IndexedDB correctly without ever refreshing this array,
  // so the search kept showing whatever (possibly empty) snapshot existed
  // when the page first loaded - exactly what a fresh DB reset hits, since
  // any sync happens strictly after that first load.
  private refreshVaFieldOptions(): void {
    this.genericIndexedDbService
      .getData(OBJECTSTORE_VA_QUESTIONS)
      .then((questions) => {
        this.vaFieldOptions = questions?.map((question: any) => ({
          label: question.value?.label,
          value: question.key,
        })) || [];
      });
  }

  // Re-fetches the question dictionary from the backend (which merges in
  // data-driven fields like isadult/ischild/instanceid found on the actual
  // uploaded records - see get_form_questions_service), writes it into
  // IndexedDB, then refreshes vaFieldOptions from that. Unlike
  // refreshVaFieldOptions() alone, this doesn't just re-read whatever
  // IndexedDB already happened to have.
  private async refreshQuestionsFromBackend(): Promise<void> {
    const response: any = await lastValueFrom(this.vaRecordsService.getQuestions());
    if (response?.data) {
      await this.genericIndexedDbService.addDataAsObjectValues(OBJECTSTORE_VA_QUESTIONS, response.data);
      await this.genericIndexedDbService.addDataAsIs(OBJECTSTORE_VA_QUESTIONS, OBJECTKEY_ODK_QUESTIONS, response.data);
    }
    this.refreshVaFieldOptions();
  }

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
          this.odkApiConfigForm.patchValue(
            this.odkApiData && Object.keys(this.odkApiData).length
              ? this.odkApiData
              : {
                url: 'https://central.iact.co.tz',
                username: 'admin@vman.net',
                password: 'password',
                form_id: 'WHOVA_V1_5_3_TZV1',
                project_id: '2',
                api_version: 'v1',
              }
          );
          this.systemConfigData = data?.system_configs;
          this.systemConfigForm.patchValue(
            this.systemConfigData && Object.keys(this.systemConfigData).length
              ? this.systemConfigData
              : {
                app_name: 'VMan3',
                page_title: 'The United Republic of Tanzania',
                page_subtitle: 'Verbal Autopsy Management Dashboard',
                admin_level1: 'Region',
                admin_level2: 'District',
                admin_level3: 'Ward',
                admin_level4: 'Village',
                map_center: '[-6.3, 34.8]',
              }
          );
          this.fieldMappingData = data?.field_mapping;
          this.fieldMappingForm.patchValue(this.fieldMappingData || {});
          this.vaSummaryData = data?.va_summary || [];
          this.fieldLabels = data?.field_labels;
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

  // Method to force refresh data
  refreshData(): void {
    this.dataLoaded = false;
    this.settingConfigService.clearCache();
    this.loadOdkApiData();
  }

  onVaSummaryFieldsChange(next: string[]): void {
    this.vaSummaryData = next;
  }

  saveVaSummaryFields(): void {
    this.isSavingVaSummary = true;
    this.settingConfigService
      .saveConnectionData('va_summary', this.vaSummaryData)
      .subscribe({
        next: () => {
          this.isSavingVaSummary = false;
          this.snackBar.open('VA Summary configuration saved successfully', 'Close', {
            duration: 3000,
          });
          this.refreshData();
        },
        error: (error) => {
          this.isSavingVaSummary = false;
          const errorMessage =
            error?.error?.detail ??
            error?.error?.message ??
            error?.message ??
            'Failed to save VA summary fields';
          this.snackBar.open(errorMessage, 'Close', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }

  saveOdkApiConfig(): void {
    if (this.odkApiConfigForm.valid) {
      this.isSavingOdkConfig = true;
      this.settingConfigService
        .saveConnectionData('odk_api_configs', this.odkApiConfigForm.value)
        .subscribe({
          next: () => {
            this.isSavingOdkConfig = false;
            this.snackBar.open('ODK API configuration saved successfully', 'Close', {
              duration: 3000,
            });
            this.refreshData();
          },
          error: (error) => {
            this.isSavingOdkConfig = false;
            const errorMessage =
              error?.error?.detail ??
              error?.error?.message ??
              error?.message ??
              'Failed to save ODK API configuration';
            this.snackBar.open(errorMessage, 'Close', {
              duration: 6000,
              panelClass: ['error-snackbar'],
            });
          },
        });
    } else {
      this.odkApiConfigForm.markAllAsTouched();
      this.snackBar.open('ODK API configuration form is invalid', 'Close', {
        duration: 3000,
      });
    }
  }

  private static readonly REQUIRED_SYSTEM_CONFIG_LABELS: Record<string, string> = {
    app_name: 'Application Name',
    page_title: 'Page Title',
    page_subtitle: 'Page Subtitle',
    admin_level1: 'Admin Level 1',
    admin_level2: 'Admin Level 2',
    admin_level3: 'Admin Level 3',
  };

  saveSystemConfig(): void {
    if (this.systemConfigForm.valid) {
      this.isSavingSystemConfig = true;
      this.settingConfigService
        .saveConnectionData('system_configs', this.systemConfigForm.value)
        .subscribe({
          next: () => {
            this.isSavingSystemConfig = false;
            this.snackBar.open('System configuration saved successfully', 'Close', {
              duration: 3000,
            });
            this.refreshData();
          },
          error: (error) => {
            this.isSavingSystemConfig = false;
            const errorMessage =
              error?.error?.detail ??
              error?.error?.message ??
              error?.message ??
              'Failed to save system configuration';
            this.snackBar.open(errorMessage, 'Close', {
              duration: 6000,
              panelClass: ['error-snackbar'],
            });
          },
        });
    } else {
      this.systemConfigForm.markAllAsTouched();
      const missingLabels = Object.entries(ConfigurationComponent.REQUIRED_SYSTEM_CONFIG_LABELS)
        .filter(([key]) => this.systemConfigForm.get(key)?.invalid)
        .map(([, label]) => label);
      const message = missingLabels.length
        ? `Please fill in the following required fields: ${missingLabels.join(', ')}`
        : 'System configuration form is invalid';
      this.snackBar.open(message, 'Close', {
        duration: 6000,
        panelClass: ['error-snackbar'],
      });
    }
  }

  // Labels for the fields required across CCVA/PCVA/DQA - kept in sync with
  // the backend's REQUIRED_FIELD_MAPPING_LABELS in odk_configs.py, which is
  // the real source of truth (this list only drives the client-side message;
  // the backend still validates on save regardless of what the form sends).
  private static readonly REQUIRED_FIELD_MAPPING_LABELS: Record<string, string> = {
    instance_id: 'Instance ID',
    va_id: 'VA ID',
    location_level1: 'Location Level 1',
    interviewer_name: 'Interviewer Name',
    is_adult: 'Is Adult',
    is_child: 'Is Child',
    is_neonate: 'Is Neonate',
  };

  saveFieldMapping(): void {
    if (this.fieldMappingForm.valid) {
      this.isSavingFieldMapping = true;
      this.settingConfigService
        .saveConnectionData('field_mapping', this.fieldMappingForm.value)
        .subscribe({
          next: () => {
            this.isSavingFieldMapping = false;
            this.snackBar.open('Field mapping saved successfully', 'Close', {
              duration: 3000,
            });
            this.refreshData();
          },
          error: (error) => {
            this.isSavingFieldMapping = false;
            const errorMessage =
              error?.error?.detail ??
              error?.error?.message ??
              error?.message ??
              'Failed to save field mapping';
            this.snackBar.open(errorMessage, 'Close', {
              duration: 6000,
              panelClass: ['error-snackbar'],
            });
          },
        });
    } else {
      this.fieldMappingForm.markAllAsTouched();
      const missingLabels = Object.entries(ConfigurationComponent.REQUIRED_FIELD_MAPPING_LABELS)
        .filter(([key]) => this.fieldMappingForm.get(key)?.invalid)
        .map(([, label]) => label);
      const message = missingLabels.length
        ? `Please map the following required fields: ${missingLabels.join(', ')}`
        : 'Field mapping form is invalid';
      this.snackBar.open(message, 'Close', {
        duration: 6000,
        panelClass: ['error-snackbar'],
      });
    }
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
      this.refreshVaFieldOptions();
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
    this.refreshVaFieldOptions();
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
        // Refresh so the enriched labels/languages are visible immediately.
        // Field Mapping's search also needs a real backend re-fetch here
        // (not just a re-read of whatever IndexedDB already had) - it's the
        // backend call that merges in data-driven fields like isadult/
        // ischild/instanceid from the actual uploaded records, which the
        // enrich-only xForm upload itself never adds to the dictionary.
        this.loadQuestionsSyncTab();
        this.loadDataDictionary();
        this.refreshQuestionsFromBackend();
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
