import { Component, model, signal, Signal } from '@angular/core';
import { PCVAConfigurations } from '../../interface';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  standalone: false,
  selector: 'app-pcva-configurations',
  templateUrl: './pcva-configurations.component.html',
  styleUrl: './pcva-configurations.component.scss'
})
export class PcvaConfigurationsComponent {

  config = model<PCVAConfigurations>({
    useICD11 : false,
    vaAssignmentLimit : 2,
    concordanceLevel : 2,
    showOtherCodersWork: true,
    enableMLIntegration: false,
  })

  constructor(private pcvaSettingsService: PcvaSettingsService, private snackBar: MatSnackBar){}

  // UI state for loading manual PCVA data
  upLoadPCVAData: boolean = false;
  pcvaDictionaries = [
    { value: '2016', label: 'WHO 2026' },
    { value: '2022', label: 'WHO 2022' },
    { value: 'other', label: 'Custom Dictionary' }
  ];
  selectedFileType: string = 'csv';
  fileToUpload: File | null = null;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.fileToUpload = input.files[0];
    } else {
      this.fileToUpload = null;
    }
  }

  uploadFile() {
    if (!this.fileToUpload) {
      this.notificationMessage('No file selected');
      return;
    }
    // Placeholder: implement actual upload logic or emit an event
    this.notificationMessage(`Uploading ${this.fileToUpload.name} as ${this.selectedFileType}`);
  }

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(){
    this.pcvaSettingsService.getPCVAConfigurations().subscribe((response: any) => {
      // Before any configuration has ever been saved, the backend returns
      // data: [] (an empty array, not null) - which is truthy in JS, so the
      // old `response?.data ? response?.data : this.config` check picked
      // the empty array over the component's own sensible defaults. The
      // signal's value became [], and the very next updateConfig() call
      // spread that into {} (an empty array/object spreads to no own
      // properties), silently dropping vaAssignmentLimit/concordanceLevel -
      // both required fields on the backend - from every save from then on,
      // which the backend rejected with a 422 the UI only ever showed as
      // "contact your IT administrator". Only replace the defaults with a
      // real, non-array configuration object.
      const data = response?.data;
      if (data && !Array.isArray(data)) {
        this.config.set(data);
      }
    });
  }

  updateConfig(key: keyof PCVAConfigurations, value: any) {
    this.config.update(prev => ({
      ...prev,
      [key]: value
    }));
  }

  saveConfigurations(){
    if(this.config().concordanceLevel > this.config().vaAssignmentLimit){
      this.notificationMessage('Concordance level should not exceed VA assignment limit!');
      return;
    }
    this.pcvaSettingsService.savePCVAConfigurations(this.config()).subscribe({
      next: (response: any) => {
        this.config.set(response?.data ? response?.data : this.config)
        this.notificationMessage('PCVA Configurations saved successfully!');
      },
      error: (error: any) => {
        this.notificationMessage("Failed to save PCVA configutation. Please, contact your IT Administrator!")
      }
    });
  }
}
