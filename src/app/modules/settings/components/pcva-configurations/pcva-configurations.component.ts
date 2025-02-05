import { Component } from '@angular/core';
import { PCVAConfigurations } from '../../interface';
import { PcvaSettingsService } from '../../services/pcva-settings.service';

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

  constructor(private pcvaSettingsService: PcvaSettingsService){}

  ngOnInit(){
    this.pcvaSettingsService.getPCVAConfigurations().subscribe((response: any) => {

      this.config = response?.data;
    });
  }

  saveConfigurations(){
    this.pcvaSettingsService.savePCVAConfigurations(this.config).subscribe((response: any) => {
      console.log(response);
    });
  }
}
