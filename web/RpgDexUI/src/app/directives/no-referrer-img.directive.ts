import { Directive, ElementRef, inject, OnInit } from '@angular/core';

@Directive({
  selector: 'img',
  standalone: true,
})
export class NoReferrerImgDirective implements OnInit {
  private el = inject(ElementRef<HTMLImageElement>);

  ngOnInit(): void {
    if (!this.el.nativeElement.hasAttribute('referrerpolicy')) {
      this.el.nativeElement.referrerPolicy = 'no-referrer';
    }
  }
}