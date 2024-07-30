import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { MatDialog } from '@angular/material/dialog';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { tap } from "rxjs";
import { AuthEmitters } from "../../emitters/auth.emitters";
import { AuthService } from "../../services/authentication/auth.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
  username?: string;
  password?: string;
  authenticated?: boolean;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    AuthEmitters.authEmitter.subscribe((authenticated: boolean) => {
      this.authenticated = authenticated;
    })
  }

  onLogin(e: any){
    e.stopPropagation()
    let failed = true;
    if(this.username && this.password){
      this.authService.login(this.username, this.password)
      .pipe(tap((response) =>{
        this.password = undefined;
      }))
      .subscribe({
        next: (response: any)=> {
          this.username = undefined;
          if(this.authenticated){
            failed = false
            // this.authService.get_user().subscribe()
            this.snackBar.open("Successfully logged in", "close", {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
              panelClass: 'snack-success',
              duration: 3 * 1000,
            })
            this.router.navigate(['/'])
          }
        },
        error: (error: any) => {
          failed = false
          this.snackBar.open("Invalid username/password", "close",{
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
            duration: 3 * 1000,
          })
        },
        complete: () => {
          if(failed){
            this.snackBar.open("Invalid username/password", "close", {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
              duration: 3 * 1000,
            })
          }
        }
      }
      )
    }
  }
  
}