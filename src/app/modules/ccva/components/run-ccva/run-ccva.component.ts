import { Component, OnInit } from '@angular/core';
import { RunCcvaService } from '../../services/run-ccva.service';
import { ConfigService } from 'app/app.service';

@Component({
  selector: 'app-run-ccva',
  templateUrl: './run-ccva.component.html',
  styleUrl: './run-ccva.component.scss'
})
export class RunCcvaComponent implements OnInit {
  
  
  constructor(
    private configService: ConfigService,
    private runCcvaService: RunCcvaService
  ){}

  data?: any;

  ngOnInit(): void {
    
  }

  onRunCCVA(){
    this.runCcvaService.run_ccva().subscribe({
      next: (response: any) => {
        if(response?.data){
          const taskId = response?.data?.task_id;
          const eventSource = new EventSource(`${this.configService.API_URL}/ccva/events/${taskId}`);
          
          eventSource.onmessage = function(event) {
              console.log("Task Completed: ", JSON.parse(event.data));
              // data = JSON.parse(event.data);
              eventSource.close();  
          };
        }
      }
    })
  }
}
