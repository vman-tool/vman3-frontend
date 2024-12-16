import { Component, Input, Output, EventEmitter, Directive, HostListener, ElementRef } from '@angular/core';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-searchable-multi-select',
  templateUrl: './searchable-multi-select.component.html',
  styleUrls: ['./searchable-multi-select.component.scss']
})
export class SearchableMultiSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() placeholder: string = 'Select options';
  @Input() singleSelect: boolean = false;
  @Input() selectedOptions: SelectOption[] = [];

  @Output() change = new EventEmitter<any>();

  searchTerm: string = '';
  isDropdownOpen: boolean = false;

  constructor(private elementRef: ElementRef){}

  get displayValue(): string {
    return this.selectedOptions.map(opt => opt.label).join(', ');
  }

  get filteredOptions(): SelectOption[] {
    return this.options.filter(option =>
      option?.label?.toLowerCase().includes(this.searchTerm?.toLowerCase())
    );
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.searchTerm = '';
  }

  selectOption(option: SelectOption) {
    if (this.singleSelect) {
      this.selectedOptions = [option];
      this.isDropdownOpen = false;
    } else {
      const index = this.selectedOptions.findIndex(
        selected => selected?.value === option?.value
      );

      if (index > -1) {
        this.selectedOptions.splice(index, 1);
      } else {
        this.selectedOptions.push(option);
      }
    }

    this.change.emit(
      this.singleSelect ?
        this.selectedOptions[0]?.value :
        this.selectedOptions.map(opt => opt.value)
    );
  }

  isSelected(option: SelectOption): boolean {
    return this.selectedOptions.some(
      selected => selected?.value === option?.value
    );
  }

  onSearchInput() {
    // Optional additional search logic if needed
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(target: any) {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.isDropdownOpen = false;
    }
  }
}