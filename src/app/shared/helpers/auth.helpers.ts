import { inject } from '@angular/core';
import { AuthService } from '../../core/services/authentication/auth.service';
import { lastValueFrom } from 'rxjs';

/**
 * Checks if user is authenticated from localstorage.
 * @returns The true if user is authenticated and vice versa
 */
export async function is_authenticated(authService: AuthService): Promise<boolean> {
    const now = new Date().getTime() / 1000;
    const access_token_time = localStorage.getItem('access_token_expiry');
    const access_token = localStorage.getItem('access_token');

    if (!access_token) {
        return false;
    }

    if (access_token_time && now <= Number(access_token_time)) {
        return true;
    }

    try {
        const response = await lastValueFrom(authService.refresh_token());

        if (response?.access_token && response?.refresh_token) {
            authService.saveUserData(response);
            return true;
        }

        return false;
    } catch (error) {
        return false;
    }
}