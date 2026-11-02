import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanService } from '../../services/plan-service';
import { PaymentService } from '../../services/payment-service';
import { PlanResponse } from '../../../models/planResponse';
import { PaymentInitiateResult } from '../../../models/paymentInitiateResult';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plans.html', 
  styleUrls: ['./plans.css']  
})
export class PlansComponent implements OnInit {
  private planService = inject(PlanService);
  private paymentService = inject(PaymentService);

  plans: PlanResponse[] = [];
  isLoadingPlans: boolean = false;
  loadingPlanId: string | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoadingPlans = true;
    this.errorMessage = null;

    this.planService.GetAllPlan().subscribe({
      next: (data: PlanResponse[]) => {
        this.plans = data ?? [];
        this.isLoadingPlans = false;
      },
      error: (err: unknown) => {
        console.error('Erro ao carregar os planos:', err);
        this.errorMessage = 'Não foi possível carregar os planos no momento.';
        this.isLoadingPlans = false;
      }
    });
  }

  subscribeToPlan(planId: string): void {
    if (!planId) return;

    this.loadingPlanId = planId;
    this.errorMessage = null;

    this.paymentService.InitiatePayment({ planId }).subscribe({
      next: (res: PaymentInitiateResult) => {
        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          this.errorMessage = 'Não foi possível gerar o link de checkout.';
          this.loadingPlanId = null;
        }
      },
      error: (err: unknown) => {
        console.error('Erro ao iniciar o pagamento:', err);
        this.errorMessage = 'Ocorreu um erro ao comunicar com o servidor de pagamentos.';
        this.loadingPlanId = null;
      }
    });
  }
}