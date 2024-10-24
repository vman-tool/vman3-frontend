import { AfterViewInit, Component, OnInit } from "@angular/core";
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
import { SystemImages } from "app/modules/settings/interface";
import { SettingConfigService } from "app/modules/settings/services/settings_configs.service";
import { ConfigService } from "app/app.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit, AfterViewInit {
  username?: string;
  password?: string;
  authenticated?: boolean;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  systemImages?: SystemImages;
  
  constructor(
    private authService: AuthService,
    private settingConfigService: SettingConfigService,
    private configService: ConfigService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadSystemImages();
    AuthEmitters.authEmitter.subscribe((authenticated: boolean) => {
      this.authenticated = authenticated;
    })
  }
  
  ngAfterViewInit(){
    this.navigate();
  }

  navigate(){
    const access_expiry_token = localStorage.getItem('access_token_expiry');
    if (access_expiry_token){
      if (new Date().getTime()/1000 < parseFloat(access_expiry_token)){
        const current_route = localStorage.getItem("latest_route") || "/"
        const to_route = current_route === '/login' || current_route === 'login' ? '/': current_route
        this.router.navigate([to_route])
      } else {
        this.authService.logout()
      }
    }
  }

  onLogin(e: any){
    e.stopPropagation()
    let failed = true;
    if(this.username && this.password){
      this.authService.login(this.username, this.password).pipe(tap((response) =>{
        this.password = undefined;
      })).subscribe(
        {
          next: (response: any)=> {
            failed = false
            if (response?.access_token){
              this.username = undefined;
              this.navigate()
              this.snackBar.open("Successfully logged in", "close", {
                horizontalPosition: this.horizontalPosition,
                verticalPosition: this.verticalPosition,
                panelClass: 'snack-success',
                duration: 3 * 1000,
              })
            } 
            if (!response?.ok && response?.status) {
              this.snackBar.open("Invalid username/password", "close",{
                horizontalPosition: this.horizontalPosition,
                verticalPosition: this.verticalPosition,
                duration: 3 * 1000,
              })
            }

            if(!response?.status && !response?.ok && !response?.access_token){
              this.snackBar.open("Kindly check your connection, then retry.", "close", {
                horizontalPosition: this.horizontalPosition,
                verticalPosition: this.verticalPosition,
                duration: 3 * 1000,
              })
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

  loadSystemImages(){
    this.settingConfigService.getSystemImages().subscribe(
      {
        next: async (response: any) => {
          if(response?.data?.length > 0){
            this.systemImages = response?.data[0]
            this.updateSystemImages()
          }
        },
        error: (error) => {
          console.log("Failed to load system images")
        }
      }
    )
  }

  private updateSystemImages(){
    if(this.systemImages && (this.systemImages?.favicon === null || !this.systemImages?.favicon)){
      this.systemImages!.favicon = '../../../../../assets/icons/favicon.ico';
    }  else {
      this.systemImages = {
        ...this.systemImages,
        favicon: this.configService.BASE_URL+ this.systemImages?.favicon
      }
    }
    
    if(this.systemImages && (this.systemImages?.logo === null || !this.systemImages?.logo)){
      this.systemImages!.logo = '../../../../assets/images/vman_logo.png';
    } else {
      this.systemImages = {
        ...this.systemImages,
        logo: this.configService.BASE_URL+ this.systemImages?.logo
      }
    }  
    
    if(this.systemImages && (this.systemImages?.home_image === null || !this.systemImages?.home_image)){
      this.systemImages!.home_image = '../../../../../assets/images/auth-bg.png';
    } else {
      this.systemImages = {
        ...this.systemImages,
        home_image:this.configService.BASE_URL+ this.systemImages?.home_image
      }
    } 
    
  }
  
}