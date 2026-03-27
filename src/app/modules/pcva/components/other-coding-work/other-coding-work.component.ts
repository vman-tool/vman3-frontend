import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { JoinIcdCodesPipe } from '../../pipes/join-icd-codes.pipe';

@Component({
  selector: 'app-other-coding-work',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, JoinIcdCodesPipe],
  templateUrl: './other-coding-work.component.html',
  styleUrl: './other-coding-work.component.scss'
})
export class OtherCodingWorkComponent {
  @Input() coders?: any[] = [];
  @Input() discordants?: any[] = [];
  
  openedCodersData: string = ''

  ngOnInit(){}
}
