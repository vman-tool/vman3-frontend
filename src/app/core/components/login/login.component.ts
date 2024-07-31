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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    AuthEmitters.authEmitter.subscribe((authenticated: boolean) => {
      this.authenticated = authenticated;
    })

    this.navigate();
  }

  navigate(){
    const access_expiry_token = localStorage.getItem('access_token_expiry');
    if (access_expiry_token){
      if (new Date().getTime()/1000 < parseFloat(access_expiry_token)){
        const current_route = localStorage.getItem("current_route") || "/"
        const to_route = current_route === '/login' || current_route === 'login' ? '/': current_route
        this.router.navigate([to_route])
      }
    }
  }

  onLogin(e: any){
    e.stopPropagation()
    let failed = true;
    const access_expiry_token = localStorage.getItem('access_token_expiry');
    if (access_expiry_token){
      if (new Date().getTime()/1000 > parseFloat(access_expiry_token)){
        this.authService.refresh_token().subscribe({
          next: (response) => {
            this.authService.saveUserData(response)
            const current_route = localStorage.getItem("current_route")
            this.router.navigate([current_route == 'login' ? '/': current_route])
          },
          error: (error: any) => {
            this.authService.logout()
            failed = false
            this.snackBar.open("Session expired. Please login again", "close", {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
              duration: 3 * 1000,
            })
          }
        });
      }
    }
    if(this.username && this.password){
      this.authService.login(this.username, this.password).pipe(tap((response) =>{
        this.password = undefined;
      }))
      .subscribe(
        {
          next: (response: any)=> {
            this.username = undefined;
            failed = false 
            setTimeout(() =>{
              this.navigate()
              this.snackBar.open("Successfully logged in", "close", {
                  horizontalPosition: this.horizontalPosition,
                  verticalPosition: this.verticalPosition,
                  panelClass: 'snack-success',
                  duration: 3 * 1000,
                })
            }, 100)
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