import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanService } from '../../services/plan-service';
import { PaymentService } from '../../services/payment-service';
import { SubscriptionService } from '../../services/subscription-service';
import { AuthService } from '../../services/auth-service';
import { PlanResponse } from '../../../models/planResponse';
import { PaymentInitiateResult } from '../../../models/paymentInitiateResult';
import { UserSubscriptionInfo } from '../../../models/userSubscriptionInfo';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface FaqItem {
  question: string;
  answer: string;
  isOpen?: boolean;
}

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plans.html',
  styleUrls: ['./plans.css'],
})
export class PlansComponent implements OnInit {
  private planService = inject(PlanService);
  private subscriptionService = inject(SubscriptionService);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  plans: PlanResponse[] = [];
  userActivePlanIds: string[] = [];
  activePlanInfo: UserSubscriptionInfo | null = null;
  isLoadingPlans: boolean = true;
  loadingPlanId: string | null = null;
  errorMessage: string | null = null;

  faqItems: FaqItem[] = [
    {
      question: 'Como funciona o Acesso Antecipado (Early Access)?',
      answer:
        'Assinantes de planos com Acesso Antecipado recebem acesso exclusivo à Biblioteca de Arquivos (para armazenar mapas, tokens e PDFs) e testam em primeira mão novos recursos antes do lançamento público.',
      isOpen: false,
    },
    {
      question: 'Posso alterar ou cancelar meu plano a qualquer momento?',
      answer:
        'Sim! Não há fidelidade. Você pode realizar o cancelamento ou alterar seu plano quando quiser diretamente pelo painel do Mercado Pago ou nas configurações da sua conta.',
      isOpen: false,
    },
    {
      question: 'O que acontece com minhas fichas e campanhas se minha assinatura expirar?',
      answer:
        'Seu conteúdo já criado continuará seguro! No entanto, o limite para criação de novas fichas, campanhas e o acesso à Biblioteca será ajustado ao limite do plano gratuito até a renovação.',
      isOpen: false,
    },
    {
      question: 'Quais são as formas de pagamento aceitas?',
      answer:
        'Aceitamos PIX, cartões de crédito (com aprovação imediata) e boleto bancário através do checkout seguro do Mercado Pago.',
      isOpen: false,
    },
  ];

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoadingPlans = true;
    this.errorMessage = null;

    const isLoggedIn = this.authService.isLoggedIn();

    forkJoin({
      allPlans: this.planService.GetAllPlan().pipe(
        catchError((err) => {
          console.error('Erro ao buscar planos:', err);
          return of(null);
        })
      ),
      freePlanLimit: this.subscriptionService.GetFreePlanLimit().pipe(
        catchError(() => of(null))
      ),
      userPlans: isLoggedIn
        ? this.subscriptionService.GetAllUserPlanInfo().pipe(
            catchError((err) => {
              console.error('Erro ao buscar plano do usuário:', err);
              return of(null);
            })
          )
        : of(null),
    }).subscribe({
      next: ({ allPlans, freePlanLimit, userPlans }) => {
        let assembledPlans: PlanResponse[] = [];

        if (allPlans?.data && allPlans.data.length > 0) {
          assembledPlans = [...allPlans.data];
        }

        const hasFreeInAllPlans = assembledPlans.some(
          (p) => p.id === 'free' || p.price === 0 || p.name.toLowerCase().includes('gratuito')
        );

        if (!hasFreeInAllPlans && freePlanLimit?.data) {
          const freeData = freePlanLimit.data;
          assembledPlans.unshift({
            id: 'free',
            name: 'Plano Gratuito',
            description: 'Acesso básico com recursos limitados.',
            price: 0,
            hasEarlyAccess: freeData.hasEarlyAccess,
            characterQty: freeData.characterQty,
            campaignQty: freeData.campaignQty,
            documentsSpaceMB: freeData.documentsSpaceMB,
            canvasSpaceMb: freeData.canvasSpaceMb,
            durationDays: freeData.durationDays || 33550336,
            tags: [],
          });
        }

        this.plans = assembledPlans.sort((a, b) => a.price - b.price);

        if (userPlans?.data && userPlans.data.length > 0) {
          this.activePlanInfo = userPlans.data[0];
          this.userActivePlanIds = userPlans.data.map((u: UserSubscriptionInfo) => u.planId);
        } else {
          const freePlanObj = this.plans.find((p) => p.price === 0 || p.id === 'free');
          this.userActivePlanIds = freePlanObj ? [freePlanObj.id] : ['free'];
        }

        this.isLoadingPlans = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro geral ao carregar dados dos planos:', err);
        this.errorMessage = 'Não foi possível carregar os planos no momento.';
        this.isLoadingPlans = false;
        this.cdr.detectChanges();
      },
    });
  }

  isUserCurrentPlan(planId: string): boolean {
    if (!planId) return false;
    return this.userActivePlanIds.includes(planId);
  }

  hasPaidPlanActive(): boolean {
    return !!this.activePlanInfo && this.activePlanInfo.planId !== 'free';
  }

  subscribeToPlan(planId: string): void {
    if (!planId || this.loadingPlanId !== null || this.isUserCurrentPlan(planId)) {
      return;
    }

    this.loadingPlanId = planId;
    this.errorMessage = null;

    this.paymentService.InitiatePayment({ planId }).subscribe({
      next: (res: PaymentInitiateResult) => {
        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          this.errorMessage = 'Não foi possível gerar o link de checkout.';
          this.loadingPlanId = null;
          this.cdr.detectChanges();
        }
      },
      error: (err: unknown) => {
        console.error('Erro ao iniciar o pagamento:', err);
        this.errorMessage = 'Ocorreu um erro ao comunicar com o servidor de pagamentos.';
        this.loadingPlanId = null;
        this.cdr.detectChanges();
      },
    });
  }

  toggleFaq(index: number): void {
    this.faqItems[index].isOpen = !this.faqItems[index].isOpen;
  }

  formatStorage(mbValue?: number): string {
    if (mbValue === undefined || mbValue === null) return '0 MB';
    if (mbValue <= 0 || mbValue === -1) return 'Ilimitado';
    if (mbValue >= 1024) {
      const gb = mbValue / 1024;
      return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
    }
    return `${mbValue} MB`;
  }

  formatDuration(days?: number): string {
    if (days === undefined || days === null) return 'mês';
    if (days >= 30000) return 'vitalício';
    if (days === 30 || days === 31) return 'mês';
    if (days === 365) return 'ano';
    if (days % 7 === 0) {
      const weeks = days / 7;
      return weeks === 1 ? 'semana' : `${weeks} semanas`;
    }
    return `${days} dias`;
  }
}