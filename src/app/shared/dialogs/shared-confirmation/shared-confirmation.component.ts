import { AfterViewInit, Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

@Component({
  selector: "app-shared-confirmation",
  templateUrl: "./shared-confirmation.component.html",
  styleUrls: ["./shared-confirmation.component.scss"],
})
export class SharedConfirmationComponent implements OnInit, AfterViewInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private matDialogRef: MatDialogRef<SharedConfirmationComponent>
  ) {}

  ngOnInit() {
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
      (dialogElement as HTMLElement).style.borderRadius = '10px';
      // (dialogElement as HTMLElement).classList.add('rounded-full');
    }
  }

  onCancel(e: any): void {
    e.stopPropagation();
    this.matDialogRef.close();
  }

  onConfirm(e: any): void {
    e.stopPropagation();
    this.matDialogRef.close({ confirmed: true });
  }

  onFormUpdate(): void {
    
  }
}