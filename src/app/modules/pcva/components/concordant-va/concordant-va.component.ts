import { Component, OnInit } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { settingsConfigData } from 'app/modules/settings/interface';
import { ConcordantVaService } from '../../services/concordant-va/concordant-va.service';
import { PcvaSettingsService } from 'app/modules/settings/services/pcva-settings.service';

@Component({
  standalone: false,
  selector: 'app-concordant-va',
  templateUrl: './concordant-va.component.html',
})
export class ConcordantVaComponent implements OnInit {
  concordantVas$?: Observable<any>;
  loadingData = false;

  pageNumber = 0;
  pageSizeOptions = [10, 20, 50, 100];
  limit = 10;

  /** Shown in the caption so the list explains its own threshold. */
  concordanceLevel?: number;
  assignmentLimit?: number;

  columns: { key: string; label: string; truncate?: boolean; emphasise?: boolean }[] = [
    { key: 'vaId', label: 'VA ID', truncate: true },
    { key: 'region', label: 'Region' },
    { key: 'district', label: 'District' },
    { key: 'interviewDay', label: 'Interview Day' },
    { key: 'underlyingCause', label: 'Agreed Underlying CoD', emphasise: true },
  ];

  constructor(
    private concordantVaService: ConcordantVaService,
    private settingConfigService: SettingConfigService,
    private pcvaSettingsService: PcvaSettingsService,
    public dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadConcordantVas();
    this.loadLabels();
    this.loadThresholds();
  }

  private loadThresholds(): void {
    this.pcvaSettingsService.getPCVAConfigurations().subscribe({
      next: (response: any) => {
        this.concordanceLevel = response?.data?.concordanceLevel;
        this.assignmentLimit = response?.data?.vaAssignmentLimit;
      },
      error: () => {},
    });
  }

  private loadLabels(): void {
    this.settingConfigService.getSettingsConfig().subscribe({
      next: (response: settingsConfigData | null) => {
        const level1 = (response as any)?.system_configs?.admin_level1;
        const level2 = (response as any)?.system_configs?.admin_level2;
        this.columns = this.columns.map(c =>
          c.key === 'region' && level1 ? { ...c, label: level1 } :
          c.key === 'district' && level2 ? { ...c, label: level2 } : c);
      },
      error: () => {},
    });
  }

  loadConcordantVas(): void {
    this.loadingData = true;
    this.concordantVas$ = this.concordantVaService.getConcordantVARecords({
      paging: true,
      // 1-based on the server, where offset is (page_number - 1) * limit
      page_number: this.pageNumber + 1,
      limit: this.limit,
    }).pipe(
      map((response: any) => { this.loadingData = false; return response; }),
      catchError((error: any) => { this.loadingData = false; return throwError(() => error); }),
    );
  }

  onOpenVA(va: any): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = '95vw';
    dialogConfig.maxWidth = '95vw';
    dialogConfig.height = '90vh';
    dialogConfig.panelClass = 'cdk-overlay-pane';
    dialogConfig.data = { va };
    this.dialog.open(ViewVaComponent, dialogConfig);
  }

  onPageChange(event: any): void {
    this.pageNumber = event?.pageIndex ?? 0;
    this.limit = Number(event?.pageSize ?? this.limit);
    this.loadConcordantVas();
  }
}
