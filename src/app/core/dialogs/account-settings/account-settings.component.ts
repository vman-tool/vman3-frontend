import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from 'app/app.service';
import { AuthService } from 'app/core/services/authentication/auth.service';

type User = {
    uuid: string;
    name: string;
    email: string;
    password: string;
    confirm_password: string;
    image: string;
    [key: string]: string;
  }

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.scss'
})
export class AccountSettingsComponent implements OnInit, AfterViewInit {
  image?: File;
  previewImage: any;
  user!: User;

  constructor( 
    public dialogRef: MatDialogRef<AccountSettingsComponent>,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ){}

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(): void {
    const current_user = JSON.parse(localStorage.getItem('current_user') || "{}")
    this.user = {
      uuid: current_user?.uuid,
      name: current_user?.name,
      email: current_user?.email,
      password: "",
      confirm_password: "",
      image: current_user && current_user?.image ? this.configService.BASE_URL+current_user.image : '../../../../assets/images/vman_profile.png'
    }
  }

  onFileSelected(e: any): void {
    const fileInput = e?.target as HTMLInputElement;
    if (fileInput?.files?.length) {
      this.image = fileInput.files[0];
  
      if (this.image) {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          this.previewImage = e?.target?.result;
        };
        reader.readAsDataURL(this.image);
      }
    }
  }

  resetPreview(): void {
    if (this.previewImage) {
      if (this.previewImage?.startsWith('blob:')) {
        URL.revokeObjectURL(this.previewImage!);
      }
    }
    this.previewImage = undefined;
    this.image = undefined;
  }

  onSubmit(form: NgForm) {
    if((this.user.password?.length || this.user.confirm_password?.length) && this.user.password !== this.user.confirm_password){
      this.notificationMessage("Passwords should match!")
    } else {
      if (form.valid) {
        let user_object: any = {};
        Object.keys(this.user)?.forEach((key: string) => {
          if(this.user[key] && key !== 'image'){
            user_object = {
              ...user_object,
              [key]: this.user[key]
            }
          }
        })
        if(this.image){
          user_object = {
            ...user_object,
            image: this.image
          }
        }
        this.authService.update_account(user_object).subscribe({
          next: () => {
            this.notificationMessage("Account updated successfully!")
            this.onClose(true)
          },
          error: (error) => {
            this.notificationMessage("Failed to update account!")
          }
        })
      } else {
        this.notificationMessage("Invalid data is submitted!")
      }
    }
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
      (dialogElement as HTMLElement).style.borderRadius = '10px';
      (dialogElement as HTMLElement).classList.add('rounded-full');
    }
  }

  onClose(results: boolean = false){
    this.dialogRef.close(results);
  }
}
