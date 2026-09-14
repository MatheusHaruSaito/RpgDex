import { TestBed } from '@angular/core/testing';

import { CampaignChatService } from './campaign-chat-service';

describe('CampaignChatService', () => {
  let service: CampaignChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CampaignChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
