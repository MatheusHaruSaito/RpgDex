import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportModalComponent } from './report-modal';

describe('ReportModalComponent', () => {
  let component: ReportModalComponent;
  let fixture: ComponentFixture<ReportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});