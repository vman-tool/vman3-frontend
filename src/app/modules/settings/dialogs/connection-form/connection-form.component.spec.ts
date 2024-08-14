import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectionFormComponent } from './connection-form.component';

describe('ConnectionFormComponent', () => {
  let component: ConnectionFormComponent;
  let fixture: ComponentFixture<ConnectionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConnectionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
