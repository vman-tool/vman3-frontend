import {
  Component,
  EventEmitter,
  input,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { SearchFieldOption } from 'app/shared/interface/main.interface';

@Component({
  selector: 'app-searchable-select-for-objects',
  templateUrl: './searchable-select-for-objects.component.html',
  styleUrl: './searchable-select-for-objects.component.scss',
})
export class SearchableSelectForObjectsComponent implements OnInit {
  @Input() label: string = '';
  @Input() items: SearchFieldOption[] = [];
  @Input() placeholder: string = 'Search...';
  @Input() value_as_tooltip: boolean = true;
  @Input() multiSelect: boolean = true;
  @Input() inputSelectedItems: any[] = [];

  @Input() reset: EventEmitter<any> = new EventEmitter();
  @Input() closeDropdown: EventEmitter<any> = new EventEmitter();

  @Output() select: EventEmitter<any> = new EventEmitter();
  @Output() open: EventEmitter<any> = new EventEmitter();

  filteredItems: SearchFieldOption[] = [];
  searchTerm: string = '';
  isOpen: boolean = false;
  selectedItemsString?: string;
  selectedItems: any[] = [];

  ngOnInit(): void {
    this.selectedItems = this.inputSelectedItems ? this.inputSelectedItems : [];
    this.selectedItemsString = this.inputSelectedItems?.length
      ? this.selectedItems.join(',')
      : '';
    this.filteredItems = [...this.items];
    this.reset.subscribe(() => {
      this.toggleDropdown();
      this.clearSelection();
    });
    this.closeDropdown.subscribe(() => {
      this.isOpen = false;
    });
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    this.open.emit(this.isOpen);
  }

  filterItems(): void {
    const filterValue = this.searchTerm.toLowerCase();
    this.filteredItems = this.items.filter(
      (item) =>
        (item.label && item.label?.toLowerCase().includes(filterValue)) ||
        (typeof item?.value !== 'object' &&
          String(item.value).toLowerCase().includes(filterValue))
    );
  }

  selectItem(item: SearchFieldOption, e?: Event): void {
    this.selectedItems = [item?.value];
    this.select.emit(this.selectedItems[0]);
  }

  checkForItem(item: SearchFieldOption, e?: Event): void {
    this.selectedItems = (e?.target as HTMLInputElement).checked
      ? [...this.selectedItems, item?.value]?.filter((item) => item)
      : this.selectedItems
          ?.filter((selectedItem) => item?.value !== selectedItem)
          ?.filter((item) => item);

    this.selectedItemsString = this.selectedItems.join(',');
    this.select.emit(this.selectedItems);
  }
  toggleItemSelection(item: SearchFieldOption): void {
    const itemIndex = this.selectedItems.indexOf(item.value);

    if (itemIndex > -1) {
      // If item is already selected, remove it
      this.selectedItems.splice(itemIndex, 1);
    } else {
      // If item is not selected, add it
      this.selectedItems.push(item.value);
    }

    this.selectedItemsString = this.selectedItems.join(',');
    this.select.emit(this.selectedItems);
  }
  clearSelection(): void {
    this.selectedItems = [];
    this.selectedItemsString = '';
  }
}
