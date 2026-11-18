import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditCampaignModal } from './edit-campaign-modal';

describe('EditCampaignModal', () => {
  let component: EditCampaignModal;
  let fixture: ComponentFixture<EditCampaignModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditCampaignModal],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCampaignModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
