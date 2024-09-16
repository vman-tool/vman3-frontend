import { Component } from '@angular/core';

@Component({
  selector: 'app-icd10',
  templateUrl: './icd10.component.html',
  styleUrl: './icd10.component.scss'
})
export class Icd10Component {
  isLoading = true;
  hasOdkApiData = false;

  selectedTab = 'system-config'; // Default selected tab
  vaSummaryObjects?: any
}
