import { inject } from '@angular/core';
import { AuthService } from '../../core/services/authentication/auth.service';
import { lastValueFrom } from 'rxjs';

/**
 * Checks if user is authenticated from localstorage.
 * @returns The true if user is authenticated and vice versa
 */
export async function is_authenticated(authService: AuthService): Promise<boolean> {
    const now = new Date().getTime() / 1000;
    let authenticated: boolean = false;
    const access_token_time = localStorage.getItem('access_token_expiry');
    
    if (access_token_time && now > (Number(access_token_time)*1000)) {
        try {
            const response = await lastValueFrom(authService.refresh_token())
            if (response?.access_token && response.refresh_token) {
                authService.saveUserData(response);
                authenticated = true;
            } else {
                authenticated = false;
            }
        } catch (error) {
            authService
            authenticated = false;
        }
    } else {
        try {
            authenticated = localStorage.getItem('access_token') && localStorage.getItem('access_token')!.length > 0 ? true : false;
        } catch (err) {
            authenticated = false;
        }
    }
    return authenticated;
}