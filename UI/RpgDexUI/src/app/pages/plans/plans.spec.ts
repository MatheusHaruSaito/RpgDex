import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlansComponent } from './plans';

describe('PlansComponent', () => {
  let component: PlansComponent;
  let fixture: ComponentFixture<PlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlansComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlansComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
