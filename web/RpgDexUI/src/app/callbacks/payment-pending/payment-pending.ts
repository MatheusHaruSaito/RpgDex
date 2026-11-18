import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-pending',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-pending.html',
  styleUrls: ['./payment-pending.css']
})
export class PaymentPendingComponent {}