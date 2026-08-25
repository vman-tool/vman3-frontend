import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchFieldOption } from 'app/shared/interface/main.interface';

/**
 * Two side-by-side lists with arrow buttons to move items between them,
 * preserving the order items were added to the right list - callers that
 * care about display order (e.g. VA Summary field order) can rely on it.
 *
 * Click toggles an item's highlight (supports selecting several before
 * moving them together); double-click moves that one item immediately.
 */
@Component({
  selector: 'app-dual-list-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dual-list-transfer.component.html',
  styleUrl: './dual-list-transfer.component.scss',
})
export class DualListTransferComponent implements OnChanges {
  @Input() items: SearchFieldOption[] = [];
  /** Values, in display order, that belong in the right-hand list. */
  @Input() selected: string[] = [];
  @Input() leftTitle = 'Available Fields';
  @Input() rightTitle = 'Selected Fields';

  @Output() selectedChange = new EventEmitter<string[]>();

  availableItems: SearchFieldOption[] = [];
  selectedItems: SearchFieldOption[] = [];

  availableSearch = '';
  selectedSearch = '';

  private highlightedAvailable = new Set<string>();
  private highlightedSelected = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] || changes['selected']) {
      this.rebuild();
    }
  }

  private rebuild(): void {
    const byValue = new Map(this.items.map((i) => [i.value, i]));
    const selectedSet = new Set(this.selected);

    this.selectedItems = this.selected
      .map((v) => byValue.get(v))
      .filter((i): i is SearchFieldOption => !!i);

    this.availableItems = this.items.filter((i) => !selectedSet.has(i.value));

    this.highlightedAvailable = new Set(
      [...this.highlightedAvailable].filter((v) => this.availableItems.some((i) => i.value === v))
    );
    this.highlightedSelected = new Set(
      [...this.highlightedSelected].filter((v) => this.selectedItems.some((i) => i.value === v))
    );
  }

  get filteredAvailable(): SearchFieldOption[] {
    const term = this.availableSearch.trim().toLowerCase();
    if (!term) return this.availableItems;
    return this.availableItems.filter(
      (i) => (i.label || '').toLowerCase().includes(term) || String(i.value ?? '').toLowerCase().includes(term)
    );
  }

  get filteredSelected(): SearchFieldOption[] {
    const term = this.selectedSearch.trim().toLowerCase();
    if (!term) return this.selectedItems;
    return this.selectedItems.filter(
      (i) => (i.label || '').toLowerCase().includes(term) || String(i.value ?? '').toLowerCase().includes(term)
    );
  }

  get highlightedAvailableCount(): number {
    return this.highlightedAvailable.size;
  }

  get highlightedSelectedCount(): number {
    return this.highlightedSelected.size;
  }

  isHighlightedAvailable(value: string): boolean {
    return this.highlightedAvailable.has(value);
  }

  isHighlightedSelected(value: string): boolean {
    return this.highlightedSelected.has(value);
  }

  toggleAvailable(value: string): void {
    if (this.highlightedAvailable.has(value)) {
      this.highlightedAvailable.delete(value);
    } else {
      this.highlightedAvailable.add(value);
    }
  }

  toggleSelected(value: string): void {
    if (this.highlightedSelected.has(value)) {
      this.highlightedSelected.delete(value);
    } else {
      this.highlightedSelected.add(value);
    }
  }

  moveRight(): void {
    if (!this.highlightedAvailable.size) return;
    const moving = this.availableItems
      .filter((i) => this.highlightedAvailable.has(i.value))
      .map((i) => i.value);
    this.highlightedAvailable.clear();
    this.emitSelected([...this.selected, ...moving]);
  }

  moveLeft(): void {
    if (!this.highlightedSelected.size) return;
    const removing = this.highlightedSelected;
    this.highlightedSelected = new Set();
    this.emitSelected(this.selected.filter((v) => !removing.has(v)));
  }

  moveOneRight(item: SearchFieldOption): void {
    this.highlightedAvailable.delete(item.value);
    this.emitSelected([...this.selected, item.value]);
  }

  moveOneLeft(item: SearchFieldOption): void {
    this.highlightedSelected.delete(item.value);
    this.emitSelected(this.selected.filter((v) => v !== item.value));
  }

  private emitSelected(next: string[]): void {
    this.selected = next;
    this.rebuild();
    this.selectedChange.emit(next);
  }
}
