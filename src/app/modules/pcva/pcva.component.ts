import { Component, OnInit } from '@angular/core';
import { IndexedDBService } from '../../shared/services/indexedDB/indexed-db.service';
import { VaRecordsService } from './services/va-records/va-records.service';

@Component({
  selector: 'app-pcva',
  templateUrl: './pcva.component.html',
  styleUrl: './pcva.component.scss'
})
export class PcvaComponent implements OnInit {
  constructor(
    private vaRecordsService: VaRecordsService,
    private indexedDBService: IndexedDBService
  ){}

  ngOnInit(): void {
    this.vaRecordsService.getQuestions().subscribe({
      next: (response: any) => {
        this.indexedDBService.addQuestions(response?.data);
        this.indexedDBService.addQuestionsAsObject(response?.data);
      }
    })
  }
}
