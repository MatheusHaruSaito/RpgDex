import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoHint } from './info-hint';

describe('InfoHint', () => {
  let component: InfoHint;
  let fixture: ComponentFixture<InfoHint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHint],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoHint);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
