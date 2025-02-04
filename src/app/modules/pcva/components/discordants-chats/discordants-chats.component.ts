import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-discordants-chats',
  templateUrl: './discordants-chats.component.html',
  styleUrl: './discordants-chats.component.scss'
})
export class DiscordantsChatsComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer?: ElementRef;
  
  @Input() messages?: any[] = []
  @Input() current_user?: any;

  constructor(private cdr: ChangeDetectorRef){}
  ngOnInit() {
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if(this.chatContainer){
        this.chatContainer.nativeElement.scrollTop = this.chatContainer?.nativeElement?.scrollHeight;
        this.cdr.markForCheck()
      }
    } catch(err) {
      console.error('Scroll to bottom failed', err);
    }
  }
}
