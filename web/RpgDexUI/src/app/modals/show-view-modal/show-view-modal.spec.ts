import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowViewModal } from './show-view-modal';

describe('ShowViewModal', () => {
  let component: ShowViewModal;
  let fixture: ComponentFixture<ShowViewModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowViewModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowViewModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
