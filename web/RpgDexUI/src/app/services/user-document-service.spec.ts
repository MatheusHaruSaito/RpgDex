import { TestBed } from '@angular/core/testing';

import { UserDocumentService } from './user-document-service';

describe('UserDocumentService', () => {
  let service: UserDocumentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserDocumentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
