import { AfterViewInit, ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VaRecordsService } from '../../../modules/pcva/services/va-records/va-records.service';
import { debounceTime, distinctUntilChanged, lastValueFrom, map, Observable, Subject, takeUntil } from 'rxjs';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { filter_keys_without_data } from 'app/shared/helpers/odk_data.helpers';
import { settingsConfigData } from 'app/modules/settings/interface';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTKEY_ODK_QUESTIONS } from 'app/shared/constants/odk.constants';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';

@Component({
  selector: 'app-view-va',
  templateUrl: './view-va.component.html',
  styleUrl: './view-va.component.scss',
})
export class ViewVaComponent implements OnInit, AfterViewInit{
  vaRecord$?: Observable<any>;
  odkQuestions?: any[];
  displayQuestions?: any[];
  questionsIds?: string[];
  summaryInfo?: any;

  searchText: string = '';
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  searchTerm: string = '';

  constructor(
    private dialogRef: MatDialogRef<ViewVaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private vaRecordsService: VaRecordsService,
    private indexedDBService: IndexedDBService,
    private genericIndexedDbService: GenericIndexedDbService,
    private settingConfigService: SettingConfigService
  ) {}
   
  ngOnInit(): void {
    this.getVaRecord();
    this.getQuestions();
    this.setupSearch();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((searchTerm: string) => {
      
      this.displayQuestions = this.odkQuestions?.filter((question: any) => question?.key?.toLowerCase().includes(searchTerm.toLowerCase()) ||  question?.value?.label?.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }

  async getSummaryConfigurations(){
    this.summaryInfo = await lastValueFrom(this.settingConfigService.getSettingsConfig()?.pipe(
      map(async (response: settingsConfigData| null) => {
        return response !== null 
        // ? await this.indexedDBService.getQuestionsByKeys(response?.va_summary) 
        ? await this.genericIndexedDbService.getDataByKeys(OBJECTSTORE_VA_QUESTIONS, response?.va_summary) 
        : null
      })
    ))
  }

  getVaRecord(): any {
    this.vaRecord$ = this.vaRecordsService.getVARecords(undefined, undefined, undefined, undefined, false, this.data?.va?.instanceid).pipe(
      map((response: any) => {
          response['data'] = filter_keys_without_data(response.data)
          return response
        })
      )
  }

  async getQuestions(): Promise<any> {
    // this.odkQuestions = await this.indexedDBService.getQuestions()
    this.odkQuestions = await this.genericIndexedDbService.getData(OBJECTSTORE_VA_QUESTIONS)
    this.displayQuestions = this.odkQuestions;
    this.getSummaryConfigurations();
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
    }
  }

  onSearch(): void {
    this.searchSubject.next(this.searchText);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  

  onClose(){
    this.dialogRef.close()
  }
}
