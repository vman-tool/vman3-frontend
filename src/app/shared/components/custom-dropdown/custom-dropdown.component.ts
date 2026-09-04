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
  @Input() widthClass = 'w-40';  // default Tailwind width
  // Smaller text/padding/caret, for a control sitting among already-small
  // text (e.g. a compact table's own header row) where the default size
  // reads oversized by comparison. Opt-in so every other call site of this
  // shared dropdown keeps its current size unchanged.
  @Input() compact = false;

  // Handle value changes
  onChange(value: string) {
    this.selectedValue = value;
    this.selectedValueChange.emit(value);
  }
}
