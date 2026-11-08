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
  styleUrls: ['./report-modal.css'],
})
export class ReportModalComponent {
  private reportService = inject(ReportService);

  @Input({ required: true }) targetId!: string;
  @Input({ required: true }) reportType!: ReportType | number | string;
  @Input() targetName: string = '';

  @Output() closed = new EventEmitter<boolean>();

  title: string = '';
  description: string = '';
  isSubmitting = false;
  errorMessage: string | null = null;

  private getNormalizedReportType(): ReportType {
    if (typeof this.reportType === 'string') {
      if (this.reportType === 'UserReport' || this.reportType === '0') return ReportType.UserReport;
      if (this.reportType === 'CampaignReport' || this.reportType === '1') return ReportType.CampaignReport;
      if (this.reportType === 'CharacterReport' || this.reportType === '2') return ReportType.CharacterReport;
    }
    return Number(this.reportType) as ReportType;
  }

  get modalTitle(): string {
    const type = this.getNormalizedReportType();

    if (type === ReportType.UserReport) {
      return `Denunciar Jogador${this.targetName ? ': ' + this.targetName : ''}`;
    }
    if (type === ReportType.CampaignReport) {
      return `Denunciar Campanha${this.targetName ? ': ' + this.targetName : ''}`;
    }
    if (type === ReportType.CharacterReport) {
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
      targetId: this.targetId,
      reportType: this.getNormalizedReportType(),
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
        this.errorMessage =
          'Ocorreu um erro interno ao enviar a sua denúncia. Tente novamente mais tarde.';
      },
    });
  }
}