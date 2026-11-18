import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignChatComponent } from './campaign-chat-component';

describe('CampaignChatComponent', () => {
  let component: CampaignChatComponent;
  let fixture: ComponentFixture<CampaignChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignChatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignChatComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
