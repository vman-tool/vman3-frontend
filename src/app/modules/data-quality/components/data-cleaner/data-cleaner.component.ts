import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataCleanerService } from '../../services/data-cleaner.service';

interface ErrorData {
  uuid: string;
  error_type: string;
  error_message: string;
  group: string;
}

@Component({
  selector: 'app-data-cleaner',
  templateUrl: './data-cleaner.component.html',
})
export class DataCleanerComponent implements OnInit {
  error: ErrorData | undefined;
  formData: { [key: string]: any } = {};
  keyDefinitions: any = {};
  isLoading: boolean = true;
  isFormDataLoading: boolean = true;
  isSaving: boolean = false; // Added: Track saving state
  searchTerm: string = '';
  filteredFormData: { [key: string]: any } = {};
  changedFormData: { [key: string]: any } = {};
  saveMessage: string = ''; // Added: Message for save status
  saveMessageType: 'success' | 'error' | '' = ''; // Added: Type of save message

  constructor(
    private route: ActivatedRoute,
    private dataCleanerService: DataCleanerService,
    private dialogRef: MatDialogRef<DataCleanerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ErrorData
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
    this.dataCleanerService.getErrorDetails(id).subscribe(
      (errorResponse) => {
        this.error = errorResponse.data['error'];
        if (this.error && this.error.uuid) {
          this.formData = errorResponse.data['form_data'];
          this.filteredFormData = { ...this.formData };
        }
        this.isLoading = false;
        this.isFormDataLoading = false;
      },
      (error) => {
        console.error('Error fetching error details:', error);
        this.isLoading = false;
        this.isFormDataLoading = false;
      }
    );
  }

  getDefinition(key: string): string {
    return this.keyDefinitions[key] || key;
  }

  isLongText(value: any): boolean {
    return typeof value === 'string' && value.length > 100;
  }

  saveChanges(): void {
    console.log(this.changedFormData, this.formData);
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
        .subscribe(
          (response) => {
            console.log('Data saved successfully:', response);
            Object.assign(this.formData, this.changedFormData);
            this.changedFormData = {};
            this.saveMessage = 'Changes saved successfully!';
            this.saveMessageType = 'success';
            this.isSaving = false;
          },
          (error) => {
            console.error('Error saving data:', error);
            this.saveMessage = 'Failed to save changes. Please try again.';
            this.saveMessageType = 'error';
            this.isSaving = false;
          }
        );
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
    console.log('Field change:', key, value);
    this.formData[key] = value;
    this.changedFormData[key] = value;
    // if (this.formData[key] !== value) {
    //   this.changedFormData[key] = value;
    // } else {
    //   // delete this.changedFormData[key];
    // }
    console.log('Field change:', this.changedFormData);
  }
}
