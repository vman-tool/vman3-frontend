import { Component, model, signal, Signal } from '@angular/core';
import { PCVAConfigurations } from '../../interface';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pcva-configurations',
  templateUrl: './pcva-configurations.component.html',
  styleUrl: './pcva-configurations.component.scss'
})
export class PcvaConfigurationsComponent {

  config = model<PCVAConfigurations>({
    useICD11 : false,
    vaAssignmentLimit : 3,
    concordanceLevel : 2,
    showOtherCodersWork: true,
  })

  constructor(private pcvaSettingsService: PcvaSettingsService, private snackBar: MatSnackBar){}

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(){
    this.pcvaSettingsService.getPCVAConfigurations().subscribe((response: any) => {
      this.config.set(response?.data ? response?.data : this.config);
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
    this.pcvaSettingsService.savePCVAConfigurations(this.config()).subscribe((response: any) => {
      this.config.set(response?.data ? response?.data : this.config)
      this.notificationMessage('PCVA Configurations saved successfully!');
    });
  }
}
