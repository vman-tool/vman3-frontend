import { Component, OnDestroy } from '@angular/core';
import { UserActivityService } from './services/user-activity/user-activity.service';

@Component({
  standalone: false,
  selector: 'app-core',
  templateUrl: './core.component.html',
  styleUrl: './core.component.scss'
})
export class CoreComponent implements OnDestroy {
  constructor(
    private userActivityService: UserActivityService
  ){}

  ngOnInit(){
    this.userActivityService.startIdleTimer();
  }

  ngOnDestroy(){
    this.userActivityService.stopIdleTimer();
  }
}
