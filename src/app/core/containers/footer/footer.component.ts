import { Component } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { VersionService } from 'app/shared/services/version.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  copyrightYear: number = new Date().getFullYear();
  SOFTWARE_VERSION: string = '';

  constructor(private configService: ConfigService, private versionService: VersionService) { }

  ngOnInit(){
    this.getSoftwareVersion();
  }

  getSoftwareVersion(){
    return this.versionService.getVersionService().subscribe({
        next: (response: any) => {
            this.SOFTWARE_VERSION = response;
        }
    })
  }
}
