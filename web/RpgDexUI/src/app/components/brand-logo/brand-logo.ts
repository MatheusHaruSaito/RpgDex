import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export type BrandLogoVariant = 'horizontal' | 'stacked' | 'icon-only';
export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-brand-logo',
  imports: [CommonModule, RouterModule],
  templateUrl: './brand-logo.html',
  styleUrl: './brand-logo.css',
})
export class BrandLogo {
  @Input() variant: BrandLogoVariant = 'horizontal';
  @Input() size: BrandLogoSize = 'md';
  @Input() iconSrc: string = 'assets/images/logo.png';
  @Input() label: string = 'RPGDex';
  @Input() link: string | null = '/home';
  @Input() textColor?: string;
  @Input() animated: boolean = false;

  /** Ativa aura/desfoque suave atrás da logo para destacá-la do fundo */
  @Input() backdropGlow: boolean = false;
}