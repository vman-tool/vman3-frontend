import { Component, Input, Output, EventEmitter, Directive, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-searchable-multi-select',
  templateUrl: './searchable-multi-select.component.html',
  styleUrls: ['./searchable-multi-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchableMultiSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() placeholder: string = 'Select options';
  @Input() multiSelect: boolean = false;
  @Input() selectedOptions: SelectOption[] = [];
  @Input() allowedAddOption: boolean = false;

  // TODO: Add logic to arrange options for better view and usability
  @Input() sortOptionsBy: boolean = false;
  @Input() sortOptionsDirection: 'asc' | 'desc' = 'asc';

  @Output() change = new EventEmitter<any>();
  @Output() addOption = new EventEmitter<any>();

  searchTerm: string = '';
  isDropdownOpen: boolean = false;

  constructor(private elementRef: ElementRef){}

  get displayValue(): string {
    return this.selectedOptions?.map(opt => opt?.label || opt?.value)?.join(', ');
  }

  get filteredOptions(): SelectOption[] {
    return this.options?.filter(option =>
      option?.label?.toLowerCase()?.includes(this.searchTerm?.toLowerCase())
    );
  }

  trackByOption(index: number, option: SelectOption): any {
    return option.value;
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.searchTerm = '';
  }

  onAddOption(){
    this.addOption.emit(this.searchTerm);
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
        this.selectedOptions?.map(opt => opt.value) :
        this.selectedOptions[0]?.value
    );
  }

  isSelected(option: SelectOption): boolean {
    return this.selectedOptions?.some(
      selected => selected?.value === option?.value
    );
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