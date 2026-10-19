import { TestBed } from '@angular/core/testing';

import { CanvasElementService } from './canvas-element-service';

describe('CanvasElementService', () => {
  let service: CanvasElementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CanvasElementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
