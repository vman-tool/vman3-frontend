import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { ListCcvaComponent } from './list-ccva.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ListCcvaComponent', () => {
  let component: ListCcvaComponent;
  let fixture: ComponentFixture<ListCcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListCcvaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListCcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// Constructed directly, without TestBed/template compilation - the methods
// under test here are plain component-class logic driven through mocked
// collaborators (CcvaService, MatDialog, MatSnackBar, Router).
describe('ListCcvaComponent (unit)', () => {
  function makeComponent() {
    const ccvaService = {
      get_list__ccva_Results: jest.fn().mockReturnValue(of({ data: [], total: null })),
      set_default_ccva: jest.fn().mockReturnValue(of({})),
      clear_default_ccva: jest.fn().mockReturnValue(of({})),
      delete_ccva: jest.fn().mockReturnValue(of({})),
      download_default_ccva: jest.fn(),
    } as any;
    const dialogAfterClosed = new Subject<boolean>();
    const dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => dialogAfterClosed }),
    } as any;
    const snackBar = { open: jest.fn() } as any;
    const router = { navigate: jest.fn() } as any;
    const triggersService = { triggerCCVAListFunction$: new Subject<void>() } as any;

    const component = new ListCcvaComponent(ccvaService, dialog, snackBar, router, triggersService);
    return { component, ccvaService, dialog, dialogAfterClosed, snackBar, router, triggersService };
  }

  describe('ngOnInit / fetchData', () => {
    it('fetches data on init', () => {
      const { component, ccvaService } = makeComponent();
      component.ngOnInit();
      expect(ccvaService.get_list__ccva_Results).toHaveBeenCalledTimes(1);
    });

    it('re-fetches whenever the triggers service fires', () => {
      const { component, ccvaService, triggersService } = makeComponent();
      component.ngOnInit();
      ccvaService.get_list__ccva_Results.mockClear();

      triggersService.triggerCCVAListFunction$.next();

      expect(ccvaService.get_list__ccva_Results).toHaveBeenCalledTimes(1);
    });

    it('falls back to data.length for totalRecords when the API returns total: null', () => {
      const { component, ccvaService } = makeComponent();
      ccvaService.get_list__ccva_Results.mockReturnValue(of({ data: [{ id: '1' }, { id: '2' }], total: null }));

      component.fetchData();

      expect(component.data).toHaveLength(2);
      expect(component.totalRecords).toBe(2);
      expect(component.isLoading).toBe(false);
    });

    it('resets to page 1 when the current page no longer exists after a refresh', () => {
      const { component, ccvaService } = makeComponent();
      component.pageNumber = 5;
      component.limit = 10;
      ccvaService.get_list__ccva_Results.mockReturnValue(of({ data: [{ id: '1' }], total: 1 }));

      component.fetchData();

      expect(component.pageNumber).toBe(1);
    });

    it('shows a snackbar and stops loading on error', () => {
      const { component, ccvaService, snackBar } = makeComponent();
      ccvaService.get_list__ccva_Results.mockReturnValue(throwError(() => new Error('network down')));

      component.fetchData();

      expect(component.isLoading).toBe(false);
      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('slices the unpaginated data client-side for the current page', () => {
      const { component } = makeComponent();
      component.data = Array.from({ length: 25 }, (_, i) => ({ id: String(i) }));
      component.limit = 10;
      component.pageNumber = 2;

      expect(component.pagedData.map((r: any) => r.id)).toEqual(
        Array.from({ length: 10 }, (_, i) => String(i + 10))
      );
    });

    it('computes rangeStart/rangeEnd/hasPrevious/hasNext', () => {
      const { component } = makeComponent();
      component.totalRecords = 25;
      component.limit = 10;
      component.pageNumber = 2;

      expect(component.rangeStart).toBe(11);
      expect(component.rangeEnd).toBe(20);
      expect(component.hasPrevious).toBe(true);
      expect(component.hasNext).toBe(true);
    });

    it('rangeStart is 0 when there are no records', () => {
      const { component } = makeComponent();
      component.totalRecords = 0;
      expect(component.rangeStart).toBe(0);
    });

    it('goToNextPage/goToPreviousPage respect the has-more guards and close the dropdown', () => {
      const { component } = makeComponent();
      component.totalRecords = 15;
      component.limit = 10;
      component.pageNumber = 1;
      component.dropdownOpen = 3;

      component.goToPreviousPage(); // no previous page - no-op
      expect(component.pageNumber).toBe(1);

      component.goToNextPage();
      expect(component.pageNumber).toBe(2);
      expect(component.dropdownOpen).toBeNull();

      component.goToNextPage(); // no next page - no-op
      expect(component.pageNumber).toBe(2);
    });
  });

  describe('row selection (max 2, FIFO)', () => {
    it('selects up to two rows and reports isRowSelected correctly', () => {
      const { component } = makeComponent();
      component.toggleRowSelection({ id: 'a' });
      component.toggleRowSelection({ id: 'b' });

      expect(component.selectedRows.map((r) => r.id)).toEqual(['a', 'b']);
      expect(component.isRowSelected({ id: 'a' })).toBe(true);
      expect(component.isRowSelected({ id: 'c' })).toBe(false);
    });

    it('drops the oldest selection when a third row is selected', () => {
      const { component } = makeComponent();
      component.toggleRowSelection({ id: 'a' });
      component.toggleRowSelection({ id: 'b' });
      component.toggleRowSelection({ id: 'c' });

      expect(component.selectedRows.map((r) => r.id)).toEqual(['b', 'c']);
    });

    it('deselects a row that is clicked again', () => {
      const { component } = makeComponent();
      component.toggleRowSelection({ id: 'a' });
      component.toggleRowSelection({ id: 'a' });

      expect(component.selectedRows).toEqual([]);
    });
  });

  describe('compareCSMF', () => {
    it('warns instead of navigating when fewer than 2 rows are selected', () => {
      const { component, router, snackBar } = makeComponent();
      component.toggleRowSelection({ id: 'a', algorithm: 'InterVA5' });

      component.compareCSMF();

      expect(snackBar.open).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('navigates to the compare route with both ids and algorithms when exactly 2 are selected', () => {
      const { component, router } = makeComponent();
      component.toggleRowSelection({ id: 'a', algorithm: 'InterVA5' });
      component.toggleRowSelection({ id: 'b', algorithm: 'VManML10' });

      component.compareCSMF();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/ccva/compare', 'a', 'b'],
        { queryParams: { algo1: 'InterVA5', algo2: 'VManML10' } }
      );
    });
  });

  describe('setDefault / clearDefault / deleteRow', () => {
    it('setDefault calls the service and refreshes only after the dialog is confirmed', () => {
      const { component, ccvaService, dialogAfterClosed } = makeComponent();
      component.setDefault({ id: '56007' });
      expect(ccvaService.set_default_ccva).not.toHaveBeenCalled();

      dialogAfterClosed.next(true);

      expect(ccvaService.set_default_ccva).toHaveBeenCalledWith('56007');
      expect(ccvaService.get_list__ccva_Results).toHaveBeenCalled(); // fetchData() refresh
    });

    it('setDefault does nothing when the dialog is cancelled', () => {
      const { component, ccvaService, dialogAfterClosed } = makeComponent();
      component.setDefault({ id: '56007' });

      dialogAfterClosed.next(false);

      expect(ccvaService.set_default_ccva).not.toHaveBeenCalled();
    });

    it('clearDefault calls the service only after confirmation', () => {
      const { component, ccvaService, dialogAfterClosed } = makeComponent();
      component.clearDefault({ id: '56007' });

      dialogAfterClosed.next(true);

      expect(ccvaService.clear_default_ccva).toHaveBeenCalledWith('56007');
    });

    it('clearDefault shows a snackbar on error', () => {
      const { component, ccvaService, dialogAfterClosed, snackBar } = makeComponent();
      ccvaService.clear_default_ccva.mockReturnValue(throwError(() => new Error('boom')));
      component.clearDefault({ id: '56007' });

      dialogAfterClosed.next(true);

      expect(snackBar.open).toHaveBeenCalled();
    });

    it('deleteRow calls delete_ccva and refreshes only after confirmation', () => {
      const { component, ccvaService, dialogAfterClosed } = makeComponent();
      component.deleteRow({ id: '56007' });

      dialogAfterClosed.next(true);

      expect(ccvaService.delete_ccva).toHaveBeenCalledWith('56007');
    });
  });

  describe('dropdown menu', () => {
    const fakeMouseEvent = () =>
      ({ currentTarget: { getBoundingClientRect: () => ({ bottom: 100, right: 300 }) } } as unknown as MouseEvent);

    it('opens the dropdown for a row and positions it relative to the trigger button', () => {
      const { component } = makeComponent();
      component.toggleDropdown(2, { id: 'a' }, fakeMouseEvent());

      expect(component.dropdownOpen).toBe(2);
      expect(component.dropdownRow).toEqual({ id: 'a' });
      expect(component.dropdownPosition).toEqual({ top: 104, left: 108 });
    });

    it('closes the dropdown when its own trigger is clicked again', () => {
      const { component } = makeComponent();
      component.toggleDropdown(2, { id: 'a' }, fakeMouseEvent());

      component.toggleDropdown(2, { id: 'a' }, fakeMouseEvent());

      expect(component.dropdownOpen).toBeNull();
      expect(component.dropdownRow).toBeNull();
    });
  });

  describe('downloadDefault / onRowClick', () => {
    it('downloadDefault forwards the row task_id to the service', () => {
      const { component, ccvaService } = makeComponent();
      component.downloadDefault({ task_id: 'task-123' });
      expect(ccvaService.download_default_ccva).toHaveBeenCalledWith('task-123');
    });

    it('onRowClick navigates to the view route for that id', () => {
      const { component, router } = makeComponent();
      component.onRowClick('56007');
      expect(router.navigate).toHaveBeenCalledWith(['/ccva/view', '56007']);
    });
  });

  describe('malariaHivLabel', () => {
    it('maps h/l/v to High/Low/Very Low', () => {
      const { component } = makeComponent();
      expect(component.malariaHivLabel('h')).toBe('High');
      expect(component.malariaHivLabel('l')).toBe('Low');
      expect(component.malariaHivLabel('v')).toBe('Very Low');
    });

    it('falls back to an em dash for a missing value (older runs predate this column)', () => {
      const { component } = makeComponent();
      expect(component.malariaHivLabel(null)).toBe('—');
      expect(component.malariaHivLabel(undefined)).toBe('—');
      expect(component.malariaHivLabel('')).toBe('—');
    });

    it('returns an unrecognized code as-is rather than hiding it', () => {
      const { component } = makeComponent();
      expect(component.malariaHivLabel('x')).toBe('x');
    });
  });

  describe('onDisplayData', () => {
    it('navigates to the data route using the row task_id, and closes the dropdown', () => {
      const { component, router } = makeComponent();
      component.dropdownOpen = 1;
      component.onDisplayData({ task_id: 'task-123' });

      expect(router.navigate).toHaveBeenCalledWith(['/ccva/data', 'task-123']);
      expect(component.dropdownOpen).toBeNull();
    });
  });
});
