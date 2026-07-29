import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataCleanerService } from '../../services/data-cleaner.service';
import { ErrorItem } from '../error-list/error-list.component';

export interface AuditChange {
  field: string;
  old_value: any;
  new_value: any;
}

export interface AuditEntry {
  changed_at: string;
  changed_by: { name: string; email: string } | null;
  changes: AuditChange[];
}

@Component({
  standalone: false,
  selector: 'app-data-cleaner',
  templateUrl: './data-cleaner.component.html',
})
export class DataCleanerComponent implements OnInit {
  error: ErrorItem | undefined;
  formData: { [key: string]: any } = {};
  keyDefinitions: any = {};
  isLoading: boolean = true;
  isFormDataLoading: boolean = true;
  isSaving: boolean = false;
  searchTerm: string = '';
  filteredFormData: { [key: string]: any } = {};
  changedFormData: { [key: string]: any } = {};
  saveMessage: string = '';
  saveMessageType: 'success' | 'error' | '' = '';
  auditTrail: AuditEntry[] = [];
  expandedAuditIndex: number | null = null;

  constructor(
    private dataCleanerService: DataCleanerService,
    private dialogRef: MatDialogRef<DataCleanerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ErrorItem
  ) {}

  ngOnInit(): void {
    const id = this.data.uuid;
    if (id) {
      this.loadErrorDetails(id);
    }
    this.changedFormData = {};
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  loadErrorDetails(id: string) {
    this.isLoading = true;
    return this.dataCleanerService.getErrorDetails(id).subscribe({
      next: (errorResponse) => {
        const d = errorResponse?.data;
        if (d) {
          this.error = d['error'];
          if (this.error && this.error.uuid) {
            this.formData = d['form_data'] ?? {};
            this.filteredFormData = { ...this.formData };
          }
          this.auditTrail = d['audit_trail'] ?? [];
        }
        this.isLoading = false;
        this.isFormDataLoading = false;
      },
      error: (err) => {
        console.error('Error fetching error details:', err);
        this.isLoading = false;
        this.isFormDataLoading = false;
      },
    });
  }

  getDefinition(key: string): string {
    return this.keyDefinitions[key] || key;
  }

  isLongText(value: any): boolean {
    return typeof value === 'string' && value.length > 100;
  }

  saveChanges(): void {
    if (
      this.error &&
      this.error.uuid &&
      Object.keys(this.changedFormData).length > 0
    ) {
      this.isSaving = true;
      this.saveMessage = '';
      this.saveMessageType = '';
      this.dataCleanerService
        .saveCleanedData(this.error.uuid, this.changedFormData)
        .subscribe({
          next: () => {
            Object.assign(this.formData, this.changedFormData);
            this.changedFormData = {};
            this.saveMessage = 'Changes saved successfully!';
            this.saveMessageType = 'success';
            this.isSaving = false;
            this.loadErrorDetails(this.error!.uuid);
          },
          error: (err) => {
            console.error('Error saving data:', err);
            this.saveMessage = 'Failed to save changes. Please try again.';
            this.saveMessageType = 'error';
            this.isSaving = false;
          },
        });
    } else {
      this.saveMessage = 'No changes to save.';
      this.saveMessageType = 'error';
    }
  }

  onSearchChange(): void {
    this.filteredFormData = Object.keys(this.formData)
      .filter(
        (key) =>
          key.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          this.getDefinition(key)
            .toLowerCase()
            .includes(this.searchTerm.toLowerCase())
      )
      .reduce((obj: any, key) => {
        obj[key] = this.formData[key];
        return obj;
      }, {});
  }

  onFieldChange(key: string, value: any): void {
    this.formData[key] = value;
    this.changedFormData[key] = value;
  }

  toggleAuditEntry(index: number): void {
    this.expandedAuditIndex = this.expandedAuditIndex === index ? null : index;
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  }

  isChanged(key: string): boolean {
    return key in this.changedFormData;
  }

  get hasChanges(): boolean {
    return Object.keys(this.changedFormData).length > 0;
  }
}