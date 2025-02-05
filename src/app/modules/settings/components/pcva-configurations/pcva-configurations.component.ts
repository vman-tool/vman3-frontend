import { Component } from '@angular/core';
import { PCVAConfigurations } from '../../interface';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pcva-configurations',
  templateUrl: './pcva-configurations.component.html',
  styleUrl: './pcva-configurations.component.scss'
})
export class PcvaConfigurationsComponent {

  config : PCVAConfigurations = {
    useICD11 : false,
    vaAssignmentLimit : 2,
    concordanceLevel : 2
  }

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
      this.config = response?.data?.length ? response?.data : this.config;
    });
  }

  saveConfigurations(){
    if(this.config.concordanceLevel > this.config.vaAssignmentLimit){
      this.notificationMessage('Concordance level should not exceed VA assignment limit!');
      return;
    }
    this.pcvaSettingsService.savePCVAConfigurations(this.config).subscribe((response: any) => {
      this.config = response?.data?.length ? response?.data : this.config
      this.notificationMessage('PCVA Configurations saved successfully!');
    });
  }
}
