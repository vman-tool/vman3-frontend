import { inject } from '@angular/core';
import { AuthService } from '../../core/services/authentication/auth.service';
import { lastValueFrom } from 'rxjs';

/**
 * Checks if user is authenticated from localstorage.
 * @returns The true if user is authenticated and vice versa
 */
export async function is_authenticated(authService: AuthService): Promise<boolean> {
    const now = new Date().getTime() / 1000;
    let is_authenticated: boolean = false;
    const access_token_time = localStorage.getItem('access_token_expiry');
    
    if (access_token_time && now > Number(access_token_time)) {
        try {
            lastValueFrom(authService.refresh_token()).then((response) => {
                console.log("authenticated")
                if (response.status === 200) {
                    authService.saveUserData(response);
                    is_authenticated = true;
                } else {
                    is_authenticated = false;
                }
            })
        } catch (error) {
            is_authenticated = false;
        }
    } else {
        try {
            is_authenticated = localStorage.getItem('access_token') && localStorage.getItem('access_token')!.length > 0 ? true : false;
        } catch (err) {
            is_authenticated = false;
        }
    }

    return is_authenticated;
}