import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Drops into any table cell that already truncates its text with
// overflow-hidden/text-ellipsis (VA ID columns in list-records, ccva-results
// and compare-cod) and makes that truncated value copyable: click it to open
// a small popover showing the full value plus a Copy button, instead of
// relying on a hover tooltip nobody can select text from.
//
// Rendered inline (not block/flex) so it inherits the parent cell's existing
// truncation/ellipsis behaviour unchanged - this only adds the click/copy
// affordance on top.
@Component({
  selector: 'app-copyable-id',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './copyable-id.component.html',
  // No box of its own - the inner <span> needs to behave as a direct inline
  // child of whatever cell hosts this (its overflow-hidden/text-ellipsis is
  // what does the truncating), not be pushed around by an extra element.
  styles: [':host { display: contents; }'],
})
export class CopyableIdComponent {
  @Input() value: string | null | undefined = '';

  open = false;
  copied = false;
  position: { top: number; left: number } = { top: 0, left: 0 };

  toggle(event: MouseEvent): void {
    if (this.open) {
      this.close();
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    // Same flip-up-when-tight-on-space idea as list-ccva.component.ts's
    // action menu, scaled down for this popover's much smaller footprint.
    const POPOVER_HEIGHT_ESTIMATE = 64;
    const spaceBelow = window.innerHeight - rect.bottom;
    this.position = {
      top: spaceBelow < POPOVER_HEIGHT_ESTIMATE
        ? Math.max(8, rect.top - 4 - POPOVER_HEIGHT_ESTIMATE)
        : rect.bottom + 4,
      left: Math.min(rect.left, Math.max(8, window.innerWidth - 240)),
    };
    this.copied = false;
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  async copy(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const text = this.value || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can be unavailable (insecure context, denied
      // permission) - fall back to the standard hidden-textarea trick
      // rather than leaving the click with no effect.
      this.legacyCopy(text);
    }
    this.copied = true;
    setTimeout(() => this.close(), 1000);
  }

  private legacyCopy(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Nothing more to do - the popover's own select-all text is the
      // final manual-copy fallback.
    }
    document.body.removeChild(textarea);
  }

  // Each row gets its own instance of this component with independent
  // state, so closing has to work by inspecting the click (via
  // composedPath, same technique ccva-results.component.ts's Columns/
  // Download menus use) rather than stopPropagation - stopping propagation
  // on the trigger would also stop this click reaching every OTHER open
  // instance's listener below, leaving their popovers stuck open.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) return;
    const path = event.composedPath() as HTMLElement[];
    const inside = path.some(el => el?.classList?.contains?.('copyable-id-wrapper'));
    if (!inside) this.close();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.close();
  }
}
