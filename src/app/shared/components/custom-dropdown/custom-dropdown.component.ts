import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-dropdown',
  standalone: true, // Mark the component as standalone
  imports: [CommonModule, FormsModule, ReactiveFormsModule], // Import required modules
  templateUrl: './custom-dropdown.component.html',
})
export class CustomDropdownComponent {
  @Input() options: { value: string; label: string }[] = []; // Dropdown options
  @Input() selectedValue: string | undefined = ''; // Selected value
  @Output() selectedValueChange = new EventEmitter<string>(); // Emit changes

  // Handle value changes
  onChange(value: string) {
    this.selectedValue = value;
    this.selectedValueChange.emit(value);
  }
}
