import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConnectionsService } from '../../services/connections.service';
import { ConnectionFormComponent } from '../../dialogs/connection-form/connection-form.component';
import { odkConfigModel } from '../../interface';

@Component({
  selector: 'app-connections',
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.scss'],
})
export class ConnectionsComponent {
  isLoading = true; // Add isLoading state
  hasOdkApiData = false;
  odkApiData: odkConfigModel | undefined;

  constructor(
    public dialog: MatDialog,
    private connectionsService: ConnectionsService
  ) {}

  ngOnInit(): void {
    this.loadOdkApiData();
  }

  loadOdkApiData(): void {
    this.isLoading = true; // Start isLoading
    this.connectionsService.getOdkApiConfig().subscribe(
      (data) => {
        this.odkApiData = data.data as odkConfigModel;
        this.hasOdkApiData = !!data.data;
        this.isLoading = false; // Stop isLoading
      },
      (error) => {
        console.error('Failed to load ODK API data:', error);
        this.isLoading = false; // Stop isLoading even on error
      }
    );
  }

  editOdkApi(): void {
    const dialogRef = this.dialog.open(ConnectionFormComponent, {
      width: '700px',
      data: this.odkApiData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.odkApiData = result;
        this.hasOdkApiData = true;
      }
    });
  }

  addOdkApi(): void {
    this.editOdkApi();
  }
}
