import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailPending } from './email-pending';

describe('EmailPending', () => {
  let component: EmailPending;
  let fixture: ComponentFixture<EmailPending>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailPending],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailPending);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
