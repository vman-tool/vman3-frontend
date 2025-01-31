import { Component } from '@angular/core';
import { CodedVaService } from '../../services/coded-va/coded-va.service';
import { STANDARD_DROPDOWN_BELOW_POSITIONS } from '@angular/cdk/overlay';

@Component({
  selector: 'app-pcva-results',
  templateUrl: './pcva-results.component.html',
  styleUrl: './pcva-results.component.scss'
})
export class PcvaResultsComponent {
  constructor(
    private codedVaService: CodedVaService
  ){}

  downloadPcvaResults(){
    this.codedVaService.downloadPcvaResults();
  }
}
