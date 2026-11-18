import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-info-hint',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info-hint.html',
  styleUrls: ['./info-hint.css'],
})
export class InfoHintComponent {
  @Input() title: string = '';
  @Input() text: string = '';
  @Input() iconClass: string = 'fa-solid fa-circle-info';
  @Input() position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right';
  
  @Input() useContent = false;

  isOpen = false;

  toggle(): void {
    this.isOpen = !this.isOpen;
  }
}