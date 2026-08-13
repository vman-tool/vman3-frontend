import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VaRecordsService } from '../../services/va-records/va-records.service';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { filter_keys_without_data } from 'app/shared/helpers/odk_data.helpers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PcvaSettingsService } from 'app/modules/settings/services/pcva-settings.service';
import {
  DEFAULT_VA_LANGUAGE,
  VaDictionary,
  VaDictionaryService,
  VaField,
} from 'app/shared/services/va-dictionary/va-dictionary.service';

@Component({
  standalone: false,
  selector: 'app-code-va',
  templateUrl: './code-va.component.html',
  styleUrls: ['./code-va.component.scss']
})
export class CodeVaComponent implements OnInit, AfterViewInit, OnDestroy {
  /** The submission being coded. */
  vaId = '';

  /** The raw submission, handed to the coding sheet unchanged. */
  record: any = null;

  loading = true;
  loadError = '';
  questionsMissing = false;

  languageOptions: { value: string; label: string }[] = [];
  hasLanguageChoice = false;
  selectedLanguage = DEFAULT_VA_LANGUAGE;

  fields: VaField[] = [];
  displayFields: VaField[] = [];

  searchText = '';

  // ---------------------------------------------------------- panel resize
  //
  // VA Details and Coding Sheet used to both be plain `flex-1` siblings, so
  // their split was computed from content size rather than held fixed - a
  // flex item's default min-width is `auto`, not 0, so once the ML analysis
  // results added wide content to the Coding Sheet side, that side's minimum
  // claim grew past its "fair" 50% and squeezed VA Details. VA Details is now
  // driven by this fixed percentage instead (see the template's CSS variable
  // binding); Coding Sheet just fills whatever's left, so neither panel's
  // width depends on what's rendered inside it, only on this value and the
  // drag handle between them.
  private static readonly WIDTH_STORAGE_KEY = 'pcva-coding-window-va-details-width';
  private static readonly MIN_PANEL_PERCENT = 20;
  private static readonly MAX_PANEL_PERCENT = 80;

  vaDetailsWidthPercent = this.loadStoredPanelWidth();
  isResizingPanels = false;

  @ViewChild('codingWindowBody') private codingWindowBody?: ElementRef<HTMLDivElement>;

  private resizeMove = (event: MouseEvent) => this.onResizerMouseMove(event);
  private resizeEnd = () => this.stopResize();

  /**
   * Whether the ML panel is offered, from PCVA Configuration.
   *
   * Read here rather than expected from each caller: every route into the
   * coding window opens this dialog, so one fetch covers them all. The
   * neighbouring showOtherCodersWork flag is passed in by callers instead, and
   * only one of the four actually passes it.
   */
  enableMLIntegration = false;

  private dictionary?: VaDictionary;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private matDialogRef: MatDialogRef<CodeVaComponent>,
    private vaRecordsService: VaRecordsService,
    private vaDictionaryService: VaDictionaryService,
    private pcvaSettingsService: PcvaSettingsService,
    private snackBar: MatSnackBar
  ) {
    // The PCVA tables pass the id as a bare string; accept a row object too, so
    // this dialog behaves like the VA record viewer whatever the caller sends.
    const va = data?.va;
    this.vaId = typeof va === 'string'
      ? va
      : (va?.instanceid || va?.vaId || va?.instanceId || '');
  }

  trackByName(_index: number, field: VaField): string {
    return field.name;
  }

  ngOnInit(): void {
    this.setupSearch();
    this.load();
    this.loadMlFlag();
  }

  private async loadMlFlag(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.pcvaSettingsService.getPCVAConfigurations());
      this.enableMLIntegration = !!response?.data?.enableMLIntegration;
    } catch {
      // Absent or unreadable configuration means the panel stays hidden.
      this.enableMLIntegration = false;
    }
  }

  /**
   * Material caps a dialog panel at 80vw, which would override the 95vw the
   * PCVA tables ask for. Relax it once the panel exists.
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
    // Defensive: only matters if the dialog is closed mid-drag, since
    // stopResize() already removes these at the end of a normal drag.
    document.removeEventListener('mousemove', this.resizeMove);
    document.removeEventListener('mouseup', this.resizeEnd);
  }

  // ---------------------------------------------------------- panel resize

  private loadStoredPanelWidth(): number {
    const stored = Number(localStorage.getItem(CodeVaComponent.WIDTH_STORAGE_KEY));
    if (!stored || Number.isNaN(stored)) return 50;
    return this.clampPanelPercent(stored);
  }

  private clampPanelPercent(value: number): number {
    return Math.min(
      CodeVaComponent.MAX_PANEL_PERCENT,
      Math.max(CodeVaComponent.MIN_PANEL_PERCENT, value)
    );
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingPanels = true;
    document.addEventListener('mousemove', this.resizeMove);
    document.addEventListener('mouseup', this.resizeEnd);
  }

  private onResizerMouseMove(event: MouseEvent): void {
    const container = this.codingWindowBody?.nativeElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    this.vaDetailsWidthPercent = this.clampPanelPercent(percent);
  }

  private stopResize(): void {
    if (!this.isResizingPanels) return;
    this.isResizingPanels = false;
    document.removeEventListener('mousemove', this.resizeMove);
    document.removeEventListener('mouseup', this.resizeEnd);
    localStorage.setItem(CodeVaComponent.WIDTH_STORAGE_KEY, String(this.vaDetailsWidthPercent));
  }

  /** Arrow keys nudge the split by 2% for keyboard/accessibility use. */
  onResizerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? -2 : 2;
    this.vaDetailsWidthPercent = this.clampPanelPercent(this.vaDetailsWidthPercent + delta);
    localStorage.setItem(CodeVaComponent.WIDTH_STORAGE_KEY, String(this.vaDetailsWidthPercent));
  }

  // ---------------------------------------------------------------- loading

  private async load(): Promise<void> {
    this.loading = true;
    this.loadError = '';

    // Without an id getVARecords asks for every submission, unpaged.
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

      this.applyLanguage();
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

  // --------------------------------------------------------------- language

  onLanguageChange(language: string): void {
    if (!language || language === this.selectedLanguage) { return; }
    this.selectedLanguage = language;
    this.applyLanguage();
  }

  /**
   * Rebuild the details pane for the selected language.
   *
   * Only the reference pane is translated - the coding sheet works from the
   * raw record and the ICD list, neither of which is language-dependent.
   */
  private applyLanguage(): void {
    this.fields = this.dictionary?.buildFields(this.record, this.selectedLanguage) ?? [];
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

  // ------------------------------------------------------------------ save

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  onSave(coded_va: any): void {
    this.vaRecordsService.codeAssignedVA(coded_va).subscribe({
      next: () => {
        this.notificationMessage('VA coded successfully!');
        this.matDialogRef.close(true);
      },
      error: (error: any) => {
        this.notificationMessage('Failed to submit VA code!');
        console.error(error);
      }
    });
  }
}
