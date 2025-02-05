import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnInit, ViewChild } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { WebSockettService } from 'app/modules/settings/services/web-socket.service';
import { DiscordantsVaService } from '../../services/discordants-va/discordants-va.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-discordants-chats',
  templateUrl: './discordants-chats.component.html',
  styleUrl: './discordants-chats.component.scss'
})
export class DiscordantsChatsComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer?: ElementRef;
  
  @Input() messages?: any[] = []
  @Input() vaRecord?: any;
  @Input() current_user?: any;
  @Input() coders?: any;
  
  newMessage: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private discordantsVaService: DiscordantsVaService,
    private ngZone: NgZone,
    private snackBar: MatSnackBar,
  ){}

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }
  ngOnInit() {
    if (this.vaRecord?.instanceid){
      this.readMessages();
    }
    this.initializeChatConnection();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  readMessages(){
    this.discordantsVaService.readDiscordantMessages(this.vaRecord?.instanceid).subscribe({
      next: (response) => {}, 
      error: (error) => {
        this.notificationMessage('Failed to read messages');
      }
    });
  }

  private initializeChatConnection(): void {

    this.discordantsVaService.connect(this.vaRecord?.instanceid);

    this.discordantsVaService.messages$.subscribe((message) => {
      const messages = this.messages || [];
      this.messages = []
      if(message?.va){
        this.ngZone.run(() => {
          messages.push(message);
          this.messages = messages
          this.autoAssignCoderName(message?.created_by)
          this.cdr.markForCheck();
          this.scrollToBottom();
        });
      }

    })
    
  }

  autoAssignCoderName(coder: string){
    const coders = Object.keys(this.coders);
    if(!coders.includes(coder)){
      let name = this.coders[coders[coders?.length - 1]];
      let last_character = Number(name[name?.length - 1]) + 1;
      let newName = name[0]+String(last_character)
      this.coders = {
        ...this.coders,
        [coder]: newName
      }
    }
  }

  private scrollToBottom(): void {
    try {
      if(this.chatContainer){
        this.chatContainer.nativeElement.scrollTop = this.chatContainer?.nativeElement?.scrollHeight;
      }
    } catch(err) {
      console.error('Scroll to bottom failed', err);
    }
  }


  sendMessage() {
    if (this.newMessage.trim()) {
      if (!this.discordantsVaService.isSocketConnected){
        this.discordantsVaService.connect(this.vaRecord?.instanceid);
      }

      if (!this.discordantsVaService.isSocketConnected){
        this.notificationMessage('Failed to send message. Please try again later.');
        return;
      }
      this.discordantsVaService.sendMessage({ text: this.newMessage });
      this.newMessage = '';
    }
  }

  ngOnDestroy(){
    this.readMessages();
    this.discordantsVaService.close()
  }
}
