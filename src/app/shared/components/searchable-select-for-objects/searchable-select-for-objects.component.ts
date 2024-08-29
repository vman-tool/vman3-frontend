import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  @Input() selectedItems: any[] = [];
  
  @Output() select: EventEmitter<any> = new EventEmitter();
  @Output() open: EventEmitter<any> = new EventEmitter();

  filteredItems: SearchFieldOption[] = [];
  searchTerm: string = '';
  isOpen: boolean = false;
  selectedItemsString?: string;

  ngOnInit(): void {
    this.filteredItems = [...this.items];
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    this.open.emit(this.isOpen);
  }

  filterItems(): void {
    const filterValue = this.searchTerm.toLowerCase();
    this.filteredItems = this.items.filter((item) =>
      item.label?.toLowerCase().includes(filterValue) || (typeof item?.value !== 'object' && String(item.value).toLowerCase().includes(filterValue))
    );
  }

  selectItem(item: SearchFieldOption, e?: Event): void {
    this.selectedItems = [item?.value]
    this.select.emit(this.selectedItems[0])
  }
  
  checkForItem(item: SearchFieldOption, e?: Event): void {
    this.selectedItems = (e?.target as HTMLInputElement).checked 
      ? [...this.selectedItems, item?.value]?.filter((item) => item) 
      : this.selectedItems?.filter((selectedItem) => item?.value !== selectedItem)?.filter((item) => item)
    
      this.selectedItemsString = this.selectedItems.join(',')
    this.select.emit(this.selectedItems)
  }
}
