import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-success.html',
  styleUrls: ['./payment-success.css']
})
export class PaymentSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  paymentId: string | null = null;

  ngOnInit(): void {
    this.paymentId = this.route.snapshot.queryParamMap.get('payment_id') ||
                    this.route.snapshot.queryParamMap.get('data.id');
  }
}