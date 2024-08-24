import { SettingConfigService } from '../../services/settings_configs.service';

import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-connection-form',
  // standalone: true,
  // imports: [FormsModule, MatProgressSpinnerModule],
  templateUrl: './connection-form.component.html',
  styleUrl: './connection-form.component.scss',
})
export class ConnectionFormComponent {
  url: string | undefined;
  username: string | undefined;
  password: string | undefined;
  project_id: string | undefined;
  api_version: string | undefined;
  form_id: string | undefined;
  isLoading: boolean = false;
  constructor(
    public dialogRef: MatDialogRef<ConnectionFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private settingConfigService: SettingConfigService,
    private snackBar: MatSnackBar
  ) {
    this.url = data?.url || '';
    this.username = data?.username || '';
    this.password = data?.password || '';
    this.form_id = data?.form_id || '';
    this.project_id = data?.project_id || '';
    this.api_version = data?.api_version || '';
  }

  onSave(): void {
    // Basic verification
    if (
      !this.url ||
      !this.username ||
      !this.password ||
      !this.form_id ||
      !this.project_id ||
      !this.api_version
    ) {
      this.notificationMessage('Please fill all fields');
      return;
    }

    // Example URL validation (basic check)
    const urlPattern = /^(http|https):\/\/[^\s$.?#].[^\s]*$/;
    if (!urlPattern.test(this.url)) {
      this.notificationMessage('Invalid URL format');
      return;
    }

    this.isLoading = true;
    this.settingConfigService
      .saveConnectionData('odk_api_configs', {
        url: this.url,
        username: this.username,
        password: this.password,
        form_id: this.form_id,
        project_id: this.project_id,
        api_version: this.api_version,
      })
      .subscribe(
        (data) => {
          console.log(data);
          this.dialogRef.close({
            url: this.url,
            username: this.username,
            password: this.password,
            form_id: this.form_id,
            project_id: this.project_id,
            api_version: this.api_version,
          });
        },
        (error) => {
          this.notificationMessage(error);
        },
        () => {
          this.isLoading = false;
        }
      );
  }

  onCancel(): void {
    // Reset form or handle cancel action
    this.url = '';
    this.username = '';
    this.password = '';
    this.form_id = '';
    this.project_id = '';
    this.dialogRef.close();
  }

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }
}
