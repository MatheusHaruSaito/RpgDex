import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailConfirmation } from './email-confirmation';

describe('EmailConfirmation', () => {
  let component: EmailConfirmation;
  let fixture: ComponentFixture<EmailConfirmation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailConfirmation],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailConfirmation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
