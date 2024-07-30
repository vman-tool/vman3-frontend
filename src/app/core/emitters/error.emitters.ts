
import { EventEmitter } from '@angular/core';

export class ErrorEmitters {
    static errorEmitter = new EventEmitter<any>();
    static successEmitter = new EventEmitter<any>();
    static menuEmitter = new EventEmitter<any>();
}
