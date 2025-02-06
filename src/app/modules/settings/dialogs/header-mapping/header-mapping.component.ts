import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-header-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './header-mapping.component.html',
})
export class HeaderMappingModalComponent {
  @Output() headerMapped = new EventEmitter<{ [key: string]: string }>();

  mappedHeaders: { [key: string]: string } = {};
  unmappedHeaders: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<HeaderMappingModalComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      message: string;
      action: string;
      mismatchedHeaders: string[];
      csvHeaders: string[];
      requiredHeaders: string[];
    }
  ) {
    this.initializeMappedHeaders();
  }

  initializeMappedHeaders(): void {
    // Auto-fill matched headers
    this.data.csvHeaders.forEach((header) => {
      if (this.data.requiredHeaders.includes(header)) {
        this.mappedHeaders[header] = header;
      }
    });

    // Initialize unmapped headers
    this.unmappedHeaders = this.data.mismatchedHeaders.filter(
      (header) => !this.mappedHeaders[header]
    );
  }

  onMapHeaders(): void {
    if (this.validateMapping()) {
      this.dialogRef.close(this.mappedHeaders);
    } else {
      // Show error message or handle invalid mapping
      console.error('Not all required headers are mapped');
    }
  }

  validateMapping(): boolean {
    return this.data.requiredHeaders.every(
      (header) =>
        this.mappedHeaders[header] !== undefined &&
        this.mappedHeaders[header] !== ''
    );
  }
}
