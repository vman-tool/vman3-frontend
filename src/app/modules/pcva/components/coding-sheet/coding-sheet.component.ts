import { AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, OnInit, Output, signal, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FieldMapping } from 'app/modules/settings/interface';
import { SelectOption } from 'app/shared/components/searchable-multi-select/searchable-multi-select.component';
import { VaRecordsService } from '../../services/va-records/va-records.service';

@Component({
  standalone: false,
  selector: 'app-coding-sheet',
  templateUrl: './coding-sheet.component.html',
  styleUrl: './coding-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodingSheetComponent implements OnInit {
  @ViewChild('chatContainer') private chatContainer?: ElementRef;
  @Input() icdCodes?: any[]; 
  @Input() settings: FieldMapping = {} as FieldMapping; 
  @Input() vaRecord?: any;
  @Input() codedVA?: any;
  @Input() allowChat?: boolean = false;
  @Input() messages?: any[] = [];
  @Input() current_user?: any;
  @Input() coders?: any[] = [];
  @Input() discordants?: any[] = [];
  @Input() showOtherCodersWork?: boolean = true;
  /** Set from PCVA Configuration; hides the ML panel entirely when off. */
  @Input() enableMLIntegration?: boolean = false;

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
  readonly panelOtherCodersState = signal(false);
  readonly panelMlOpenState = signal(false);

  // ── ML analysis ───────────────────────────────────────────────────────────
  // Signals rather than plain fields: this component is OnPush, so a value the
  // template reads has to be one change detection can see change.
  readonly mlRunning = signal(false);
  readonly mlElapsed = signal(0);
  readonly mlStatus = signal('');
  readonly mlResult = signal<any>(null);
  readonly mlError = signal('');
  /** True when the shown result was loaded from a saved coding, not just run. */
  readonly mlStored = signal(false);
  private mlTimer: ReturnType<typeof setInterval> | null = null;
  
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
    private vaRecordsService: VaRecordsService,
  ){}

  /**
   * Ask the model for a probable cause of death for this record.
   *
   * The request takes roughly 20 seconds - the sentence embedding and
   * prediction dominate - so this reports elapsed time and a changing status
   * line rather than a percentage it would have to invent. The backend gives
   * no intermediate signal over plain HTTP, and a bar that pretends to know
   * how far along it is would be a lie.
   */
  /**
   * Show the analysis stored with an existing coding, if there is one.
   *
   * Deliberately not re-run: the model is retrained over time, so a fresh
   * prediction could differ from the one the coder actually saw. The audit
   * trail is what they saw, not what the model would say today.
   */
  private restoreStoredMlAnalysis(): void {
    const stored = this.codedVA?.ml_analysis;
    if (stored?.cause) {
      this.mlResult.set(stored);
      this.mlStored.set(true);
    }
  }

  runMlAnalysis(): void {
    this.mlStored.set(false);
    const vaId = this.vaRecord?.instanceid;
    if (!vaId) {
      this.mlError.set('This record has no id, so it cannot be analyzed.');
      return;
    }
    if (this.mlRunning()) { return; }

    this.mlRunning.set(true);
    this.mlError.set('');
    this.mlResult.set(null);
    this.mlElapsed.set(0);
    this.mlStatus.set('Preparing the record...');

    this.mlTimer = setInterval(() => {
      const seconds = this.mlElapsed() + 1;
      this.mlElapsed.set(seconds);
      if (seconds === 3) { this.mlStatus.set('Running the model...'); }
      if (seconds === 12) { this.mlStatus.set('Still working - this usually takes about 20 seconds.'); }
      if (seconds === 40) { this.mlStatus.set('Taking longer than usual. The model may be loading for the first time.'); }
    }, 1000);

    this.vaRecordsService.analyseVaWithMl(vaId).subscribe({
      next: (response: any) => {
        this.stopMlTimer();
        this.mlResult.set(response?.data ?? null);
        this.mlRunning.set(false);
      },
      error: (error: any) => {
        this.stopMlTimer();
        this.mlRunning.set(false);
        this.mlError.set(
          error?.error?.detail || 'The analysis failed. Please try again.'
        );
      },
    });
  }

  private stopMlTimer(): void {
    if (this.mlTimer) { clearInterval(this.mlTimer); this.mlTimer = null; }
  }

  /**
   * Bar width for one contribution, relative to the strongest in the same
   * record. SHAP values have no fixed upper bound, so a bar is only meaningful
   * against its siblings - never across records.
   */
  contributionWidth(item: any, all: any[]): number {
    const strongest = Math.max(...(all ?? []).map(c => Math.abs(c?.weight ?? 0)), 0);
    if (!strongest) { return 0; }
    return Math.max(4, Math.round((Math.abs(item?.weight ?? 0) / strongest) * 100));
  }

  /** Percentage helper so the template stays free of formatting logic. */
  asPercent(value: number | null | undefined): string {
    return value == null ? '—' : `${Math.round(value * 100)}%`;
  }

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
    this.restoreStoredMlAnalysis();
  }

  assignValuesForUpdate(){
    const latestVA = this.codedVA?.length ? this.codedVA[0] : undefined
    if(latestVA){
      this.selectedA = latestVA?.frameA?.a ? [{
        label: `${latestVA?.frameA?.a?.code} - ${latestVA?.frameA?.a?.name}`,
        value: latestVA?.frameA?.a?.uuid
      }] : []

      this.selectedB = latestVA?.frameA?.b ? [{
        label: `${latestVA?.frameA?.b?.code} - ${latestVA?.frameA?.b?.name}`,
        value: latestVA?.frameA?.b?.uuid
      }] : []

      this.selectedC = latestVA?.frameA?.c ? [{
        label: `${latestVA?.frameA?.c?.code} - ${latestVA?.frameA?.c?.name}`,
        value: latestVA?.frameA?.c?.uuid
      }] : []

      this.selectedD = latestVA?.frameA?.d ? [{
        label: `${latestVA?.frameA?.d?.code} - ${latestVA?.frameA?.d?.name}`,
        value: latestVA?.frameA?.d?.uuid
      }] : []
      
      this.selectedContributories = latestVA?.frameA?.contributories?.length ? latestVA?.frameA?.contributories?.map((contributory: any) => {
        return {
          label: `${contributory?.code} - ${contributory?.name}`,
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
        clinicalNotes: this.clinicalNotes,
        // Recorded only when the coder actually ran it, so its absence means
        // "coded without ML help" rather than "we forgot to store it".
        ml_analysis: this.mlResult() ? {
          ...this.mlResult(),
          analysed_by: this.current_user?.uuid,
          analysed_by_name: this.current_user?.name,
          analysed_at: new Date().toISOString(),
        } : null,
        [this.settings.birth_date]: this.birthDate,
        [this.settings.birth_date]:this.deathDate,
        [this.settings.deceased_gender]: this.gender,
        [this.settings.is_adult]: this.vaRecord[this.settings.is_adult],
        [this.settings.is_child]: this.vaRecord[this.settings.is_child],
        [this.settings.is_neonate]: this.vaRecord[this.settings.is_neonate]
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
}