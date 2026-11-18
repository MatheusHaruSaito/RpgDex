import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignDetail } from './campaign-detail';

describe('CampaignDetail', () => {
  let component: CampaignDetail;
  let fixture: ComponentFixture<CampaignDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
