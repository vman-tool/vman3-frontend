import { Component, OnInit } from '@angular/core';
import { PcvaSettingsService } from '../settings/services/pcva-settings.service';
import { lastValueFrom } from 'rxjs';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_ICD10 } from 'app/shared/constants/indexedDB.constants';
import { OBJECTKEY_ICD10_INDEXDB } from 'app/shared/constants/pcva.constants';
import { ResponseMainModel } from 'app/shared/interface/main.interface';

@Component({
  selector: 'app-pcva',
  templateUrl: './pcva.component.html',
  styleUrl: './pcva.component.scss'
})
export class PcvaComponent implements OnInit {
  constructor(
    private pcvaSettingsService: PcvaSettingsService,
    private indexedDBService: GenericIndexedDbService
  ){}


  ngOnInit(): void {
    this.getICD10Codes();
  }

  async getICD10Codes(){
    const icd10Codes: any = await lastValueFrom(this.pcvaSettingsService.getICD10Codes({paging: false}));
    this.indexedDBService.addDataAsIs(OBJECTSTORE_ICD10, OBJECTKEY_ICD10_INDEXDB, icd10Codes?.data);
  }
}
