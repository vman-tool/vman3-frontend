import { AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit, Output, signal, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from 'app/app.service';
import { FieldMapping } from 'app/modules/settings/interface';
import { WebSockettService } from 'app/modules/settings/services/web-socket.service';
import { SelectOption } from 'app/shared/components/searchable-multi-select/searchable-multi-select.component';
import { DiscordantsVaService } from '../../services/discordants-va/discordants-va.service';

@Component({
  selector: 'app-coding-sheet',
  templateUrl: './coding-sheet.component.html',
  styleUrl: './coding-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodingSheetComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer?: ElementRef;
  @Input() icdCodes?: any[]; 
  @Input() settings: FieldMapping = {} as FieldMapping; 
  @Input() vaRecord?: any;
  @Input() codedVA?: any;
  @Input() allowChat?: boolean = false;
  @Input() messages?: any[] = [];
  @Input() current_user?: any;

  @Output() save: EventEmitter<any> = new EventEmitter<any>();

  readonly panelAOpenState = signal(true);
  readonly panelBOpenState = signal(false);
  readonly panelCOpenState = signal(false);
  readonly subPanelAOpenState = signal(false);
  readonly subPanelBOpenState = signal(false);
  readonly subPanelCOpenState = signal(false);
  readonly subPanelDOpenState = signal(false);
  readonly panelClinicalOpenState = signal(false);
  readonly panelChatSectionOpenState = signal(false);
  
  gender: string = "";
  birthDate: string = "";
  deathDate: string = "";
  clinicalNotes?: string;
  newMessage: string = '';

  frameA: {
    a?: any,
    timeinterval_a?: string,
    b?: any,
    timeinterval_b?: string,
    c?: any,
    timeinterval_c?: string,
    d?: any,
    timeinterval_d?: string,
    contributories?: any[]
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
    dateOfInjury?: string,
    howExternalOrPoisoningAgent?: string
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

  selectedA: SelectOption[] = [];
  selectedB: SelectOption[] = [];
  selectedC: SelectOption[] = [];
  selectedD: SelectOption[] = [];
  selectedContributories: SelectOption[] = [];
  messageSubscription: any;

  constructor(
    private snackBar: MatSnackBar,
    private configService: ConfigService,
    private webSockettService: WebSockettService,
    private discordantsVaService: DiscordantsVaService
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

    this.assignValuesForUpdate();

    if(this.allowChat){
      this.initializeWebSocket();
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  assignValuesForUpdate(){
    const latestVA = this.codedVA?.length ? this.codedVA[0] : undefined
    if(latestVA){
      this.selectedA = latestVA?.frameA?.a ? [{
        label: `${latestVA?.frameA?.a?.code} ${latestVA?.frameA?.a?.name}`,
        value: latestVA?.frameA?.a?.uuid
      }] : []

      this.selectedB = latestVA?.frameA?.b ? [{
        label: `${latestVA?.frameA?.b?.code} ${latestVA?.frameA?.b?.name}`,
        value: latestVA?.frameA?.b?.uuid
      }] : []

      this.selectedC = latestVA?.frameA?.c ? [{
        label: `${latestVA?.frameA?.c?.code} ${latestVA?.frameA?.c?.name}`,
        value: latestVA?.frameA?.c?.uuid
      }] : []

      this.selectedD = latestVA?.frameA?.d ? [{
        label: `${latestVA?.frameA?.d?.code} ${latestVA?.frameA?.d?.name}`,
        value: latestVA?.frameA?.d?.uuid
      }] : []
      
      this.selectedContributories = latestVA?.frameA?.contributories?.length ? latestVA?.frameA?.contributories?.map((contributory: any) => {
        return {
          label: `${contributory?.code} ${contributory?.name}`,
          value: contributory?.uuid
        }
      }) : []

      this.frameA.timeinterval_a = latestVA?.frameA?.timeinterval_a
      this.frameA.timeinterval_b = latestVA?.frameA?.timeinterval_b
      this.frameA.timeinterval_c = latestVA?.frameA?.timeinterval_c
      this.frameA.timeinterval_d = latestVA?.frameA?.timeinterval_d

      this.frameB = latestVA?.frameB;
      this.mannerOfDeath = latestVA?.mannerOfDeath
      this.placeOfOccurence = {
        place: latestVA?.placeOfOccurence?.place || '',
        specific: latestVA?.placeOfOccurence?.specific || ''
      }
      this.fetalOrInfant = latestVA?.fetalOrInfant
      this.pregnantDeceased = latestVA?.pregnantDeceased
      this.clinicalNotes = latestVA?.clinicalNotes
    }
  }

  setContributories(contributories: any[]){
    this.frameA.contributories = contributories;
  }

  onSubmitform(){
    if(this.validateframeA() && this.validateframeB()){
      this.save.emit({
        assigned_va: this.vaRecord?.instanceid,
        frameA: this.frameA, 
        frameB: this.frameB, 
        mannerOfDeath: this.mannerOfDeath, 
        placeOfOccurence: this.placeOfOccurence, 
        fetalOrInfant: this.fetalOrInfant, 
        pregnantDeceased: this.pregnantDeceased,
        clinicalNotes: this.clinicalNotes
      })
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

  private initializeWebSocket(): void {

    this.discordantsVaService.connect(this.vaRecord?.instanceid);

    this.discordantsVaService.messages$.subscribe((message) => {
      const messages = this.messages
      if(message?.va){
        messages?.push(message)
        
        this.messages = []
        setTimeout(() => {
          this.messages = messages;
        }, 200)
        this.scrollToBottom()
      }
      
      
    })
    
  }

  private scrollToBottom(): void {
    try {
      if(this.chatContainer){
        this.chatContainer.nativeElement.scrollTop = this.chatContainer?.nativeElement?.scrollHeight;
      }
    } catch(err) {
      console.error('Scroll to bottom failed', err);
    }
  }


  sendMessage() {
    if (this.newMessage.trim()) {
      this.discordantsVaService.sendMessage({ text: this.newMessage });
      this.newMessage = '';
    }
  }

  ngOnDestroy(){
    this.discordantsVaService.close()
  }
}