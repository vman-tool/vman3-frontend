import { Component } from '@angular/core';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { lastValueFrom, map } from 'rxjs';

@Component({
  selector: 'app-core',
  templateUrl: './core.component.html',
  styleUrl: './core.component.scss'
})
export class CoreComponent {
  constructor(
  ){}

  async ngOnInit(): Promise<void> {
  }
}
