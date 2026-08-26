import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ViewCcvaComponent } from './view-ccva.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ViewCcvaComponent', () => {
  let component: ViewCcvaComponent;
  let fixture: ComponentFixture<ViewCcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewCcvaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewCcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// Constructed directly, without TestBed/template compilation - the methods
// under test here are plain component-class logic.
describe('ViewCcvaComponent (unit)', () => {
  function makeComponent(queryParams: any = {}) {
    const ccvaService = {
      delete_ccva: jest.fn().mockReturnValue(of({})),
      set_default_ccva: jest.fn().mockReturnValue(of({})),
    } as any;
    const location = { back: jest.fn() } as any;
    const route = { queryParams: of(queryParams) } as any;

    const component = new ViewCcvaComponent(ccvaService, location, route);
    return { component, ccvaService, location };
  }

  describe('onDateRangeChange', () => {
    it('clears both filter dates when the option is "all"', () => {
      const { component } = makeComponent();
      component.dateRangeOption = 'all';
      component.filter_startDate = '2026-01-01';
      component.filter_endDate = '2026-02-01';

      component.onDateRangeChange();

      expect(component.filter_startDate).toBeNull();
      expect(component.filter_endDate).toBeNull();
    });

    it('leaves the dates untouched for a custom range', () => {
      const { component } = makeComponent();
      component.dateRangeOption = 'custom';
      component.filter_startDate = '2026-01-01';
      component.filter_endDate = '2026-02-01';

      component.onDateRangeChange();

      expect(component.filter_startDate).toBe('2026-01-01');
      expect(component.filter_endDate).toBe('2026-02-01');
    });
  });

  describe('onBack / onCancel', () => {
    it('onBack delegates to Location.back()', () => {
      const { component, location } = makeComponent();
      component.onBack();
      expect(location.back).toHaveBeenCalled();
    });

    it('onCancel stops the tracked task', () => {
      const { component } = makeComponent();
      component.isTaskRunning = true;
      component.onCancel();
      expect(component.isTaskRunning).toBe(false);
    });
  });

  describe('onDelete', () => {
    it('deletes the task from the query id and navigates back on success', () => {
      const { component, ccvaService, location } = makeComponent({ id: '56007' });

      component.onDelete();

      expect(ccvaService.delete_ccva).toHaveBeenCalledWith('56007');
      expect(location.back).toHaveBeenCalled();
    });

    it('does not call the service when there is no id in the query params', () => {
      const { component, ccvaService } = makeComponent({});

      component.onDelete();

      expect(ccvaService.delete_ccva).not.toHaveBeenCalled();
    });
  });

  describe('onSetDefault', () => {
    it('sets the task from the query id as default', () => {
      const { component, ccvaService } = makeComponent({ id: '56007' });

      component.onSetDefault();

      expect(ccvaService.set_default_ccva).toHaveBeenCalledWith('56007');
    });

    it('does not call the service when there is no id in the query params', () => {
      const { component, ccvaService } = makeComponent({});

      component.onSetDefault();

      expect(ccvaService.set_default_ccva).not.toHaveBeenCalled();
    });
  });
});
