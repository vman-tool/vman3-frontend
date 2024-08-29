import { Component } from '@angular/core';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';

@Component({
  selector: 'app-core',
  templateUrl: './core.component.html',
  styleUrl: './core.component.scss'
})
export class CoreComponent {
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
