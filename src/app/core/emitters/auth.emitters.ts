import { EventEmitter } from '@angular/core';

export class AuthEmitters {
    static authEmitter =  new EventEmitter<boolean>();
    static userDetailsEmitter =  new EventEmitter<any>();
}