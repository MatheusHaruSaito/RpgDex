import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { ReportService } from '../../services/report-service';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';
import { ReportType } from '../../../models/reportType';
import { REPORT_LIMITS } from '../../../models/reportLimits';

const IMAGES_FIELD = 'images';

interface EvidenceImage {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-modal.html',
  styleUrls: ['./report-modal.css'],
})
export class ReportModalComponent implements OnDestroy {
  private reportService = inject(ReportService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) targetId!: string;
  @Input({ required: true }) reportType!: ReportType | number | string;
  @Input() targetName: string = '';

  @Output() closed = new EventEmitter<boolean>();

  readonly limits = REPORT_LIMITS;

  title = '';
  description = '';
  isSubmitting = false;
  errorMessage: string | null = null;
  images: EvidenceImage[] = [];

  get maxSizeMb(): number {
    return this.limits.maxImageSizeBytes / (1024 * 1024);
  }

  get canAddMore(): boolean {
    return this.images.length < this.limits.maxImages;
  }

  private static readonly TYPE_BY_NAME: Record<string, ReportType> = {
    userreport: ReportType.UserReport,
    characterreport: ReportType.CharacterReport,
    campaignreport: ReportType.CampaignReport,
    customreport: ReportType.CustomReport,
  };

  private getNormalizedReportType(): ReportType | null {
    if (typeof this.reportType === 'number') return this.reportType;

    const byName = ReportModalComponent.TYPE_BY_NAME[String(this.reportType).toLowerCase()];
    if (byName !== undefined) return byName;

    const n = Number(this.reportType);
    return Number.isInteger(n) && ReportType[n] !== undefined ? n : null;
  }

  get modalTitle(): string {
    const type = this.getNormalizedReportType();
    const name = this.targetName ? ': ' + this.targetName : '';

    if (type === ReportType.UserReport) return `Denunciar Jogador${name}`;
    if (type === ReportType.CampaignReport) return `Denunciar Campanha${name}`;
    if (type === ReportType.CharacterReport) return `Denunciar Personagem${name}`;
    return 'Enviar Denúncia';
  }

  closeModal(success = false): void {
    this.closed.emit(success);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    const rejected: string[] = [];

    for (const file of files) {
      if (this.images.some((i) => this.isSameFile(i.file, file))) continue;

      if (!this.canAddMore) {
        rejected.push(`${file.name} (limite de ${this.limits.maxImages} imagens)`);
      } else if (!file.type.startsWith('image/')) {
        rejected.push(`${file.name} (não é uma imagem)`);
      } else if (file.size > this.limits.maxImageSizeBytes) {
        rejected.push(`${file.name} (maior que ${this.maxSizeMb} MB)`);
      } else {
        this.images.push({ file, preview: URL.createObjectURL(file) });
      }
    }

    this.errorMessage = rejected.length
      ? `Não foi possível anexar: ${rejected.join('; ')}.`
      : null;
  }

  removeImage(index: number): void {
    const [removed] = this.images.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.preview);
  }

  private isSameFile(a: File, b: File): boolean {
    return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  }

  submitReport(): void {
    if (!this.title.trim() || !this.description.trim()) {
      this.errorMessage = 'Por favor, preencha o título e a descrição do motivo da denúncia.';
      return;
    }

    const type = this.getNormalizedReportType();
    if (type === null || !this.targetId) {
      console.error('[ReportModal] Alvo inválido:', {
        targetId: this.targetId,
        reportType: this.reportType,
      });
      this.errorMessage = 'Não foi possível identificar o alvo da denúncia.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const form = new FormData();
    form.append('title', this.title.trim());
    form.append('description', this.description.trim());
    form.append('targetId', this.targetId);
    form.append('reportType', String(type));
    this.images.forEach((img) => form.append(IMAGES_FIELD, img.file, img.file.name));

    this.reportService
      .CreateReport(form)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            alert('Denúncia enviada com sucesso! A equipa de moderação analisará o caso.');
            this.closeModal(true);
          } else {
            this.errorMessage = res.message || 'Erro ao enviar denúncia.';
          }
        },
        error: (err) => {
          console.error('[ReportModal] Erro ao enviar denúncia:', err);
          this.errorMessage =
            'Ocorreu um erro ao enviar a sua denúncia. Tente novamente mais tarde.';
          ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
            this.errorMessage = msg;
            this.cdr.markForCheck();
          });
        },
      });
  }

  ngOnDestroy(): void {
    this.images.forEach((img) => URL.revokeObjectURL(img.preview));
  }
}