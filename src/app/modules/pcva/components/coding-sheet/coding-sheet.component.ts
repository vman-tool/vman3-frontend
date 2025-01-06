import { ChangeDetectionStrategy, Component, Input, OnInit, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FieldMapping } from 'app/modules/settings/interface';

@Component({
  selector: 'app-coding-sheet',
  templateUrl: './coding-sheet.component.html',
  styleUrl: './coding-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodingSheetComponent implements OnInit {
  @Input() icdCodes?: any[]; 
  @Input() settings: FieldMapping = {} as FieldMapping; 
  @Input() vaRecord?: any;

  readonly panelAOpenState = signal(true);
  readonly panelBOpenState = signal(false);
  readonly panelCOpenState = signal(false);
  readonly subPanelAOpenState = signal(false);
  readonly subPanelBOpenState = signal(false);
  readonly subPanelCOpenState = signal(false);
  readonly subPanelDOpenState = signal(false);
  
  gender: string = "";
  birthDate: string = "";
  deathDate: string = "";

  frameA: {
    a?: any,
    timeinterval_a?: string,
    b?: any,
    timeinterval_b?: string,
    c?: any,
    timeinterval_c?: string,
    d?: any,
    timeinterval_d?: string,
    constributories?: any[]
  } = {}

  frameB: {
    surgeryPerformed?: string,
    surgeryDate?: string,
    surgeryReasons?: string,
    autopsyRequested?: string,
    wereFindingsUsedInCertification?: string
  } = {}

  mannerOfDeath: {
    manner?: string,
    dateofInjury?: string,
    howexternalOrPoisoningAgent?: string
  } = {}

  placeOfOccurence: {
    place?: string,
    specific?: string
  } = {}

  fetalOrInfant: {
    multiplePregnancy?: string,
    stillBorn?: boolean,
    hoursSurvived?: number,
    birthWeight?: number,
    completedWeeksOfPregnancy?: number,
    ageOfMother?: number,
    mothersConditionToNewborn?: string
  } = {}

  pregnantDeceased: {
    pregnancyStatus?: string,
    pregnantTime?: string,
    didPregnancyContributed?: string,
  } = {}

  constructor(
    private snackBar: MatSnackBar,
  ){}

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(): void {
    const sex = this.vaRecord[this.settings.deceased_gender]?.toLowerCase()
    this.gender = sex !== 'male' && sex !== 'female' ? 'unknown' : sex;
    this.birthDate = this.vaRecord[this.settings.birth_date];
    this.deathDate = this.vaRecord[this.settings.death_date];
  }

  onSubmitform(){
    console.log('Form submitted', this.frameA, this.frameB, this.mannerOfDeath, this.placeOfOccurence, this.fetalOrInfant, this.pregnantDeceased);
    if(this.validateframeA() && this.validateframeB()){
      this.notificationMessage('Form submitted successfully!');
    }
  }

  validateframeA(){
    if (
      this.frameA.timeinterval_a && !this.frameA.a || 
      this.frameA.timeinterval_b && !this.frameA.b || 
      this.frameA.timeinterval_c && !this.frameA.c || 
      this.frameA.timeinterval_d && !this.frameA.d){
        this.notificationMessage('Please fill inteval when cause of death is filled!');
        return false;
    }

    if (!this.frameA.a && !this.frameA.b && !this.frameA.c && !this.frameA.d){
      this.notificationMessage('Please fill at least one cause of death!');
      return false;
    }

    return true
  }

  validateframeB(){
    if (this.frameB?.surgeryPerformed && !this.frameB.surgeryPerformed){
      this.notificationMessage('Please fill surgery reasons for surgery!');
      return false;
    }
    return true;
  }
}