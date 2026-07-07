import { Component } from '@angular/core';
import { UserActivityService } from './services/user-activity/user-activity.service';

@Component({
  standalone: false,
  selector: 'app-core',
  templateUrl: './core.component.html',
  styleUrl: './core.component.scss'
})
export class CoreComponent {
  constructor(
    private userActivityService: UserActivityService
  ){

  }

  ngOnInit(){
    this.userActivityService.startIdleTimer();
  }
}
