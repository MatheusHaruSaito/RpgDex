import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report-service';
import { CreateReportRequest } from '../../../models/createReportRequest';
import { ReportType } from '../../../models/reportType';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-modal.html',
  styleUrls: ['./report-modal.css']
})
export class ReportModalComponent {
  private reportService = inject(ReportService);

  @Input({ required: true }) targetId!: string;
  @Input({ required: true }) reportType!: ReportType | number;
  @Input() targetName: string = '';

  @Output() closed = new EventEmitter<boolean>();

  title: string = '';
  description: string = '';
  isSubmitting = false;
  errorMessage: string | null = null;

  get modalTitle(): string {
    // Trata valores numéricos e enum garantindo que Campanha e Personagem fiquem corretos
    const type = Number(this.reportType);
    
    if (type === 0 || this.reportType === ReportType.UserReport) {
      return `Denunciar Jogador${this.targetName ? ': ' + this.targetName : ''}`;
    }
    if (type === 1 || this.reportType === ReportType.CampaignReport) {
      return `Denunciar Campanha${this.targetName ? ': ' + this.targetName : ''}`;
    }
    if (type === 2 || this.reportType === ReportType.CharacterReport) {
      return `Denunciar Personagem${this.targetName ? ': ' + this.targetName : ''}`;
    }
    return 'Enviar Denúncia';
  }

  closeModal(success = false): void {
    this.closed.emit(success);
  }

  submitReport(): void {
    if (!this.title.trim() || !this.description.trim()) {
      this.errorMessage = 'Por favor, preencha o título e a descrição do motivo da denúncia.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const request: CreateReportRequest = {
      title: this.title.trim(),
      description: this.description.trim(),
      dataId: this.targetId,
      ReportEnum: Number(this.reportType) as ReportType
    };

    this.reportService.CreateReport(request).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          alert('Denúncia enviada com sucesso! A equipa de moderação analisará o caso.');
          this.closeModal(true);
        } else {
          this.errorMessage = res.message || 'Erro ao enviar denúncia.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('[ReportModal] Erro ao enviar denúncia:', err);
        this.errorMessage = 'Ocorreu um erro interno ao enviar a sua denúncia. Tente novamente mais tarde.';
      }
    });
  }
}