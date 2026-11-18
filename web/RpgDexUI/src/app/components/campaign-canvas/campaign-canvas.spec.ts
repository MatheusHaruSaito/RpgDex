import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignCanvas } from './campaign-canvas';

describe('CampaignCanvas', () => {
  let component: CampaignCanvas;
  let fixture: ComponentFixture<CampaignCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignCanvas],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignCanvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
