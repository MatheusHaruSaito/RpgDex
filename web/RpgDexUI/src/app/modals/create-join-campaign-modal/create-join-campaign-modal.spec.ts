import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateJoinCampaignModal } from './create-join-campaign-modal';

describe('CreateJoinCampaignModal', () => {
  let component: CreateJoinCampaignModal;
  let fixture: ComponentFixture<CreateJoinCampaignModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateJoinCampaignModal],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateJoinCampaignModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
