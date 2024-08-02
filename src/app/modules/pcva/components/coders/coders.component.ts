import { Component, OnInit } from '@angular/core';
import { CodersService } from '../../services/coders/coders.service';
import { catchError, map, Observable } from 'rxjs';

@Component({
  selector: 'app-coders',
  templateUrl: './coders.component.html',
  styleUrl: './coders.component.scss'
})
export class CodersComponent implements OnInit {
  
  codersData$?: Observable<any>;
  loadingData: boolean = false;
  
  constructor(private codersService: CodersService){}

  ngOnInit(): void {
    this.loadingData = true
    this.codersData$ = this.codersService.getCoders(true).pipe(
      map((response) => {
        // this.loadingData = false
       return response;
      }),
      catchError((error: any) => {
        // this.loadingData = false
        return error;
      })
    );
  }

}
