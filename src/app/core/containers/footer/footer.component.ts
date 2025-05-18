import { Component } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  copyrightYear: number = new Date().getFullYear();

  constructor(private configService: ConfigService) { }

  get SOFTWARE_VERSION(){
    return this.configService.SOFTWARE_VERSION
  }
}
