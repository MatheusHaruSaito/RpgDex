import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="skeleton-box" [ngStyle]="{ width: width, height: height, borderRadius: radius }"></div>`,
  styleUrls: ['./skeleton.css']
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '20px';
  @Input() radius = '8px';
}