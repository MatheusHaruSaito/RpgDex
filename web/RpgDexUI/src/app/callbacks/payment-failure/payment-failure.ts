import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-failure',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-failure.html',
  styleUrls: ['./payment-failure.css']
})
export class PaymentFailureComponent {}