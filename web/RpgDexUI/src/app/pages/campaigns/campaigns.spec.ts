import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Campaigns } from './campaigns';

describe('Campaigns', () => {
  let component: Campaigns;
  let fixture: ComponentFixture<Campaigns>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Campaigns],
    }).compileComponents();

    fixture = TestBed.createComponent(Campaigns);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
