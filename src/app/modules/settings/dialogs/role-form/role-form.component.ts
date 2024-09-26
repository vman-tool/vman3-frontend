import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-role-form',
  templateUrl: './role-form.component.html',
  styleUrl: './role-form.component.scss'
})
export class RoleFormComponent implements OnInit, AfterViewInit {
  
  constructor(
    public dialogRef: MatDialogRef<RoleFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ){}

  ngOnInit(): void {
    
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
      (dialogElement as HTMLElement).style.borderRadius = '10px';
      (dialogElement as HTMLElement).classList.add('rounded-full');
    }
  }

  availableItems: string[] = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];
  selectedItems: string[] = [];
  searchTermAvailable: string = '';
  searchSelectedTerm: string = '';

  // Filter the available items based on the search term
  filteredItems() {
    return this.availableItems.filter(item =>
      item.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
    );
  }
  
  filteredSelectedItems() {
    return this.selectedItems.filter(item =>
      item.toLowerCase().includes(this.searchSelectedTerm.toLowerCase())
    );
  }

  // Move selected items to the "selected items" list
  moveToSelected() {
    const selected = this.availableItems.filter(item => this.selectedItems.indexOf(item) === -1);
    this.selectedItems = [
      ...this.selectedItems,
      ...selected
    ];
    this.availableItems = this.availableItems.filter(item => item);
  }

  // Move selected items back to the "available items" list
  moveToAvailable() {
    const deselected = this.selectedItems.filter(item => this.availableItems.indexOf(item) === -1);
    this.availableItems = this.availableItems.concat(deselected);
    this.selectedItems = this.selectedItems.filter(item => !deselected.includes(item));
  }

}
