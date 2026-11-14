import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrandLogo } from '../../components/brand-logo/brand-logo';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule, BrandLogo],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class FooterComponent {}