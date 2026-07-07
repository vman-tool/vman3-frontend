import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../material/material.module';
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SearchableSelectForObjectsComponent } from './components/searchable-select-for-objects/searchable-select-for-objects.component';
import { SearchableMultiSelectComponent } from './components/searchable-multi-select/searchable-multi-select.component';
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    SearchableSelectForObjectsComponent,
    SearchableMultiSelectComponent,
  ],
  providers: [DatePipe],
  exports: [
    SearchableSelectForObjectsComponent,
    SearchableMultiSelectComponent,
  ],
})
export class SharedModule {}
