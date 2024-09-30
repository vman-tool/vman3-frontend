import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignRolesFormComponent } from './assign-roles-form.component';

describe('AssignRolesFormComponent', () => {
  let component: AssignRolesFormComponent;
  let fixture: ComponentFixture<AssignRolesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AssignRolesFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignRolesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
