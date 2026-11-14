import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgeVerificationModal } from './age-verification-modal';

describe('AgeVerificationModal', () => {
  let component: AgeVerificationModal;
  let fixture: ComponentFixture<AgeVerificationModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgeVerificationModal],
    }).compileComponents();

    fixture = TestBed.createComponent(AgeVerificationModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
