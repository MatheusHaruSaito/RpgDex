import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuardianConsent } from './guardian-consent';

describe('GuardianConsent', () => {
  let component: GuardianConsent;
  let fixture: ComponentFixture<GuardianConsent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardianConsent],
    }).compileComponents();

    fixture = TestBed.createComponent(GuardianConsent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
