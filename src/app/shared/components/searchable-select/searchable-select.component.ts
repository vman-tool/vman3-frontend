import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { SearchFieldOption } from '../../interface/main.interface';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
})
export class SearchableSelectComponent implements OnInit {
  @Input() label: string = '';
  @Input() control!: AbstractControl;
  @Input() items: SearchFieldOption[] = [];
  @Input() placeholder: string = 'Search...';
  @Input() multiSelect: boolean = false;

  filteredItems: SearchFieldOption[] = [];
  searchTerm: string = '';
  isOpen: boolean = false;

  get formControl(): FormControl {
    return this.control instanceof FormControl
      ? this.control
      : new FormControl();
  }

  ngOnInit(): void {

    this.filteredItems = [...this.items];
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  // filterItems(): void {
  //   const filterValue = this.searchTerm.toLowerCase();
  //   this.filteredItems = this.items.filter((item) =>
  //     item.toLowerCase().includes(filterValue)
  //   );
  // }
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
    this.formControl.setValue(
      this.multiSelect == false ? item?.value : [item?.value]
    );
    this.toggleDropdown();
  }
}
