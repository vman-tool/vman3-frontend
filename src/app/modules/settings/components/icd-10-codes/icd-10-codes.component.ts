import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, Observable } from 'rxjs';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { AddIcd10CodesComponent } from '../../dialogs/add-icd10-codes/add-icd10-codes.component';

@Component({
  selector: 'app-icd-10-codes',
  templateUrl: './icd-10-codes.component.html',
  styleUrl: './icd-10-codes.component.scss'
})
export class Icd10CodesComponent {
  
  view: string = 'codes';  

  switchView(view: string){
    this.view = view;
  }
}
