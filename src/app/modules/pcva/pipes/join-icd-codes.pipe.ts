import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'joinIcdCodes',
  standalone: true
})
export class JoinIcdCodesPipe implements PipeTransform {

  transform(icdCodes: any[], delimeter: string): unknown {
    return icdCodes?.map((code) => `${code?.code}-${code?.name}`).join(delimeter);
  }

}
