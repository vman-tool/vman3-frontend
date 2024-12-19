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
  @Input() multiSelect: boolean = false;
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

    if(this.isDropdownOpen) {
      this.updateDropdownPosition();
    }
  }

  selectOption(option: SelectOption) {
    if (this.multiSelect) {
      const index = this.selectedOptions.findIndex(
        selected => selected?.value === option?.value
      );

      if (index > -1) {
        this.selectedOptions.splice(index, 1);
      } else {
        this.selectedOptions.push(option);
      }
    } else {
      this.selectedOptions = [option];
      this.isDropdownOpen = false;
    }

    this.change.emit(
      this.multiSelect ?
        this.selectedOptions.map(opt => opt.value) :
        this.selectedOptions[0]?.value
    );
  }

  isSelected(option: SelectOption): boolean {
    return this.selectedOptions.some(
      selected => selected?.value === option?.value
    );
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }

  updateDropdownPosition() {
    const inputElement = this.elementRef.nativeElement.querySelector('.select-input');
    const dropdownElement = this.elementRef.nativeElement.querySelector('.dropdown');
    const rect = inputElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;

    // If space below is less than space above, show dropdown above
    if (spaceBelow < spaceAbove) {
      dropdownElement.style.bottom = '100%';
      dropdownElement.style.top = 'auto';
      dropdownElement.style.maxHeight = `${spaceAbove - 10}px`; // Leave 10px margin
    } else {
      dropdownElement.style.top = '100%';
      dropdownElement.style.bottom = 'auto';
      dropdownElement.style.maxHeight = `${spaceBelow - 10}px`; // Leave 10px margin
    }
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(target: any) {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.isDropdownOpen = false;
    }
  }
}