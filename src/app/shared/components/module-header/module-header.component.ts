import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

/**
 * The heading block for a module that has sub-pages.
 *
 * The module name stays put while the sub-page name changes underneath it, so
 * a section reads as one place rather than as a set of unrelated screens: the
 * PCVA menu is always "Physician Coded VA", with Coders, All Assigned and the
 * rest as its sub-pages.
 *
 * The sub-page name comes from `data.title` on the route, so the label lives
 * beside the route it belongs to instead of in a lookup table that has to be
 * kept in step with the router.
 */
@Component({
  standalone: true,
  selector: 'app-module-header',
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">{{ title }}</div>
        <p class="page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <ng-content></ng-content>
    </div>
  `,
})
export class ModuleHeaderComponent implements OnInit, OnDestroy {
  /** The module name. Constant across every sub-page. */
  @Input() title = '';

  subtitle = '';

  private destroy$ = new Subject<void>();

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.resolveSubtitle();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => this.resolveSubtitle());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Walk to the deepest activated route and take its declared title. */
  private resolveSubtitle(): void {
    let route = this.route.root;
    let title = '';
    while (route) {
      title = route.snapshot.data?.['title'] ?? title;
      if (!route.firstChild) { break; }
      route = route.firstChild;
    }
    this.subtitle = title;
  }
}
