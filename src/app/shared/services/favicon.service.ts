import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class FaviconService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  changeFavicon(iconUrl: string) {
    if(isPlatformBrowser(this.platformId)){
      const link: HTMLLinkElement = document.querySelector('#app-favicon') || this.createFaviconTag();
      link.href = iconUrl;
    }
  }

  private createFaviconTag(): HTMLLinkElement {
    if(isPlatformBrowser(this.platformId)){
      const link = document.createElement('link');
      link.id = 'app-favicon';
      link.rel = 'icon';
      document.head.appendChild(link);
      return link;
    } else {
      const link = document.createElement('link');
      link.id = 'app-favicon';
      link.rel = 'icon';
      document.head.appendChild(link);
      return link;

    }
  }
}