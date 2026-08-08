import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SettingConfigService } from '../../services/settings_configs.service';

export interface ResetSourceOption {
  value: string;
  label: string;
  description: string;
}

/** One line of the "what will be deleted" breakdown. */
interface ScopeLine {
  label: string;
  count: number;
}

export const RESET_CONFIRMATION_WORD = 'DELETE';

/**
 * Confirms an irreversible delete of VA data.
 *
 * The dialog fetches the exact counts first, so the user confirms a specific
 * amount of destruction rather than the idea of it, and only then unlocks the
 * button behind a typed confirmation.
 */
@Component({
  standalone: false,
  selector: 'app-confirm-reset',
  templateUrl: './confirm-reset.component.html',
})
export class ConfirmResetComponent implements OnInit {
  readonly confirmationWord = RESET_CONFIRMATION_WORD;

  sources: string[] = [];
  sourceLabels = '';

  loadingScope = true;
  scopeError = '';
  scopeLines: ScopeLine[] = [];
  submissionCount = 0;
  relatedCount = 0;

  typedConfirmation = '';
  isDeleting = false;
  deleteError = '';

  /** Human names for the collections the cascade touches. */
  private static readonly LINE_LABELS: { [key: string]: string } = {
    submissions: 'VA records',
    ccva_results: 'CCVA results',
    assigned_va: 'PCVA assignments',
    pcva_results: 'PCVA coding results',
    pcva_messages: 'PCVA messages',
    ccva_corrections: 'CCVA error corrections',
  };

  constructor(
    private dialogRef: MatDialogRef<ConfirmResetComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sources: string[]; labels: string },
    private settingConfigService: SettingConfigService
  ) {
    this.sources = data?.sources ?? [];
    this.sourceLabels = data?.labels ?? '';
  }

  ngOnInit(): void {
    this.loadScope();
  }

  private async loadScope(): Promise<void> {
    this.loadingScope = true;
    this.scopeError = '';
    try {
      const response: any = await firstValueFrom(
        this.settingConfigService.previewDataReset(this.sources)
      );
      const counts = response?.data?.counts ?? {};

      this.submissionCount = counts['submissions'] ?? 0;
      this.scopeLines = Object.keys(ConfirmResetComponent.LINE_LABELS)
        .filter(key => (counts[key] ?? 0) > 0)
        .map(key => ({ label: ConfirmResetComponent.LINE_LABELS[key], count: counts[key] }));
      this.relatedCount = this.scopeLines
        .filter(line => line.label !== 'VA records')
        .reduce((sum, line) => sum + line.count, 0);
    } catch (error: any) {
      console.error('Failed to read the reset scope:', error);
      this.scopeError =
        error?.error?.detail || 'Could not work out what would be deleted. Nothing has been changed.';
    } finally {
      this.loadingScope = false;
    }
  }

  get isConfirmed(): boolean {
    return this.typedConfirmation.trim() === this.confirmationWord;
  }

  get canDelete(): boolean {
    return (
      this.isConfirmed &&
      !this.isDeleting &&
      !this.loadingScope &&
      !this.scopeError &&
      this.submissionCount > 0
    );
  }

  async onDelete(): Promise<void> {
    if (!this.canDelete) { return; }

    this.isDeleting = true;
    this.deleteError = '';
    try {
      const response: any = await firstValueFrom(
        this.settingConfigService.resetData(this.sources, this.confirmationWord)
      );
      this.dialogRef.close({ deleted: true, response });
    } catch (error: any) {
      console.error('Reset failed:', error);
      this.deleteError =
        error?.error?.detail || 'The deletion failed. Some records may not have been removed.';
      this.isDeleting = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
