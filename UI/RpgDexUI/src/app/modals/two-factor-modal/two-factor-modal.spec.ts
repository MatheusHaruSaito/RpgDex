import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwoFactorModal } from './two-factor-modal';

describe('TwoFactorModal', () => {
  let component: TwoFactorModal;
  let fixture: ComponentFixture<TwoFactorModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFactorModal],
    }).compileComponents();

    fixture = TestBed.createComponent(TwoFactorModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
