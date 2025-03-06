import { Component } from '@angular/core';
import { CodedVaService } from '../../services/coded-va/coded-va.service';
import { STANDARD_DROPDOWN_BELOW_POSITIONS } from '@angular/cdk/overlay';
import { ResponseMainModel } from 'app/shared/interface/main.interface';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';

@Component({
  selector: 'app-pcva-results',
  templateUrl: './pcva-results.component.html',
  styleUrl: './pcva-results.component.scss'
})
export class PcvaResultsComponent {
  pageNumber?: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit?: number = 10;
  paging?: boolean;

  pcvaresults?: any;
  paginator?: any;
  total: number = 0;

  constructor(
    public dialog: MatDialog,
    private codedVaService: CodedVaService
  ){}

  ngOnInit(): void {
    this.getPcvaResults();
  }


  getPcvaResults() {
    this.codedVaService.getPCVAResults(
      {
        paging: true,
        page_number: this.pageNumber,
        limit: this.limit,
      }
    ).subscribe({
      next: (response: any) => {
        this.pcvaresults =  response?.data;
        this.paginator = response?.pager
        this.total = response?.total
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

   onOpenVA(va: any){
      let dialogConfig = new MatDialogConfig();
      dialogConfig.autoFocus = true;
      dialogConfig.width = "95vw";
      dialogConfig.height = "90vh";
      dialogConfig.panelClass = "cdk-overlay-pane"
      dialogConfig.data = {
        va: va,
      }
      this.dialog.open(ViewVaComponent, dialogConfig)
    }


  onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
    this.getPcvaResults();
  }
  downloadPcvaResults(){
    this.codedVaService.downloadPcvaResults();
  }
}
