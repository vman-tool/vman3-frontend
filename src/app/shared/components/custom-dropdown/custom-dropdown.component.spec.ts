import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDropdownComponent } from './custom-dropdown.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CustomDropdownComponent', () => {
  let component: CustomDropdownComponent;
  let fixture: ComponentFixture<CustomDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDropdownComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('compact', () => {
    it('defaults to the regular size, leaving every existing call site unchanged', () => {
      fixture.detectChanges();
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
      const icon: SVGElement = fixture.nativeElement.querySelector('svg');
      expect(select.className).toContain('px-4');
      expect(select.className).toContain('py-2');
      expect(select.className).not.toContain('text-xs');
      expect(icon.getAttribute('class')).toContain('w-5');
    });

    it('shrinks the select, its padding, and the caret icon when compact is set', () => {
      component.compact = true;
      fixture.detectChanges();
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
      const icon: SVGElement = fixture.nativeElement.querySelector('svg');
      expect(select.className).toContain('px-2.5');
      expect(select.className).toContain('py-1');
      expect(select.className).toContain('text-xs');
      expect(icon.getAttribute('class')).toContain('w-3.5');
    });
  });
});
