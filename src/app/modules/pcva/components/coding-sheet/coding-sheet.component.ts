import { Component, Input, OnInit } from '@angular/core';
import { FieldMapping } from 'app/modules/settings/interface';

@Component({
  selector: 'app-coding-sheet',
  templateUrl: './coding-sheet.component.html',
  styleUrl: './coding-sheet.component.scss'
})
export class CodingSheetComponent implements OnInit {
  @Input() icdCodes?: any[]; 
  @Input() settings: FieldMapping = {} as FieldMapping; 
  @Input() vaRecord?: any; 
  gender: string = "";
  birthDate: string = "";
  deathDate: string = "";

  a?: any;
  b?: any;
  c?: any;
  d?: any;

  constributories?: any[];

  constructor(){}

  ngOnInit(): void {
    const sex = this.vaRecord[this.settings.deceased_gender]?.toLowerCase()
    this.gender = sex !== 'male' && sex !== 'female' ? 'unknown' : sex;
    this.birthDate = this.vaRecord[this.settings.birth_date];
    this.deathDate = this.vaRecord[this.settings.death_date];
  }


}