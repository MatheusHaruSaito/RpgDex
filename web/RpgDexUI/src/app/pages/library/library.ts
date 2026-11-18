import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { UserDocumentService } from '../../services/user-document-service';
import { SubscriptionService } from '../../services/subscription-service';
import { UserDocumentResponse } from '../../../models/userDocumentResponse';
import { CreateUserDocumentRequest } from '../../../models/createUserDocumentRequest';
import { UpdateUserDocumentRequest } from '../../../models/updateUserDocumentRequest';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

export type PreviewCategory = 'image' | 'pdf' | 'other';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class LibraryComponent implements OnInit, OnDestroy {
  private documentService = inject(UserDocumentService);
  private subscriptionService = inject(SubscriptionService);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  readonly acceptedExtensions: string[] = [
    'png',
    'jpg',
    'jpeg',
    'webp',
    'gif',
    'bmp',
    'pdf',
    'txt',
    'docx',
    'xlsx',
    'pptx',
    'csv',
  ];

  readonly acceptAttribute: string =
    '.png,.jpg,.jpeg,.webp,.gif,.bmp,.pdf,.txt,.docx,.xlsx,.pptx,.csv';

  readonly acceptedFormatsGroups = [
    { label: 'Imagens & Mapas', formats: 'PNG, JPG, JPEG, WEBP, GIF, BMP', icon: 'fa-file-image' },
    { label: 'PDFs', formats: 'PDF', icon: 'fa-file-pdf' },
    { label: 'Textos & Documentos', formats: 'TXT, DOCX', icon: 'fa-file-lines' },
    { label: 'Planilhas & Slides', formats: 'XLSX, CSV, PPTX', icon: 'fa-file-excel' },
  ];

  documents: UserDocumentResponse[] = [];
  filteredDocuments: UserDocumentResponse[] = [];

  usedStorageMb = 0;
  storageCapacityMb = 0;

  isLoading = false;
  isUploading = false;
  isUpdating = false;

  hasAccess = true;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  activeFilter: 'all' | 'pdf' | 'image' | 'doc' | 'sheet' = 'all';
  viewMode: 'grid' | 'list' = 'grid';

  // Modal Upload
  showUploadModal = false;
  selectedFile: File | null = null;
  uploadPreviewUrl: string | null = null;
  uploadSafePdfUrl: SafeResourceUrl | null = null;
  uploadPreviewType: PreviewCategory = 'other';
  uploadData = {
    name: '',
    description: '',
  };

  // Modal Edição
  showEditModal = false;
  editingDoc: UserDocumentResponse | null = null;
  editData = {
    name: '',
    description: '',
  };
  editSelectedFile: File | null = null;
  editPreviewUrl: string | null = null;
  editSafePdfUrl: SafeResourceUrl | null = null;
  editPreviewType: PreviewCategory = 'other';

  // Modal Pré-visualização de documento salvo
  previewDoc: UserDocumentResponse | null = null;
  previewDocSafeUrl: SafeResourceUrl | null = null;

  get hasStorageLimit(): boolean {
    return this.storageCapacityMb > 0;
  }

  get storagePercentage(): number {
    if (!this.hasStorageLimit) return 0;
    const pct = (this.usedStorageMb / this.storageCapacityMb) * 100;
    return Math.min(100, Math.round(pct));
  }

  get isStorageLimitReached(): boolean {
    return this.hasStorageLimit && this.usedStorageMb >= this.storageCapacityMb;
  }

  get isStorageNearLimit(): boolean {
    return (
      this.hasStorageLimit &&
      !this.isStorageLimitReached &&
      this.usedStorageMb / this.storageCapacityMb >= 0.8
    );
  }

  ngOnInit(): void {
    this.checkAccessAndLoad();
  }

  ngOnDestroy(): void {
    this.revokeUploadPreview();
    this.revokeEditPreview();
  }

  checkAccessAndLoad(): void {
    this.isLoading = true;
    this.clearMessages();

    this.subscriptionService.HasEarlyAccess().subscribe({
      next: (hasEarlyAccess: boolean) => {
        if (!hasEarlyAccess) {
          this.hasAccess = false;
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        this.hasAccess = true;
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erro ao verificar Early Access:', err);
        this.hasAccess = false;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadDocuments(): void {
    this.documentService.GetAllByUserId(1, 100).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.documents = res.data.elements ?? [];
          this.usedStorageMb = res.data.canvasSizeMb ?? 0;
          this.storageCapacityMb = res.data.campaignStorageCapaity ?? 0;
          this.applyFilters();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.errorMessage = msg;
          this.cdr.detectChanges();
        });
      },
    });
  }

  applyFilters(): void {
    let result = [...this.documents];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.name?.toLowerCase().includes(term) ||
          doc.description?.toLowerCase().includes(term) ||
          doc.fileName?.toLowerCase().includes(term),
      );
    }

    if (this.activeFilter !== 'all') {
      result = result.filter((doc) => {
        const ext = this.getFileExtension(doc.fileName);
        if (this.activeFilter === 'pdf') return ext === 'pdf';
        if (this.activeFilter === 'image')
          return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext);
        if (this.activeFilter === 'doc') return ['txt', 'docx'].includes(ext);
        if (this.activeFilter === 'sheet') return ['xlsx', 'pptx', 'csv'].includes(ext);
        return true;
      });
    }

    this.filteredDocuments = result;
  }

  setFilter(category: 'all' | 'pdf' | 'image' | 'doc' | 'sheet'): void {
    this.activeFilter = category;
    this.applyFilters();
  }

  // ── VALIDAÇÃO E PRÉVIA DE ARQUIVO ────────────────────────
  isFileAccepted(file: File): boolean {
    const ext = this.getFileExtension(file.name);
    return this.acceptedExtensions.includes(ext);
  }

  private hasEnoughStorageForFile(file: File, replacedFileBytes: number = 0): boolean {
    if (!this.hasStorageLimit) return true;
    const newFileMb = file.size / (1024 * 1024);
    const replacedFileMb = replacedFileBytes / (1024 * 1024);
    const projectedUsageMb = Math.max(0, this.usedStorageMb - replacedFileMb) + newFileMb;

    if (projectedUsageMb > this.storageCapacityMb) {
      this.errorMessage = `Espaço insuficiente na biblioteca! Este arquivo (${newFileMb.toFixed(1)} MB) ultrapassa o limite de ${this.storageCapacityMb} MB.`;
      return false;
    }
    return true;
  }

  getPreviewCategory(fileName: string): PreviewCategory {
    const ext = this.getFileExtension(fileName);
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'other';
  }

  private setUploadFile(file: File): void {
    if (!this.isFileAccepted(file)) {
      this.errorMessage = `Formato não suportado (.${this.getFileExtension(file.name) || 'desconhecido'}). Formatos aceitos: PNG, JPG, JPEG, WEBP, GIF, BMP, PDF, TXT, DOCX, XLSX, PPTX e CSV.`;
      return;
    }

    if (!this.hasEnoughStorageForFile(file)) {
      return;
    }

    this.errorMessage = '';
    this.revokeUploadPreview();
    this.selectedFile = file;
    this.uploadPreviewType = this.getPreviewCategory(file.name);

    if (this.uploadPreviewType === 'image' || this.uploadPreviewType === 'pdf') {
      this.uploadPreviewUrl = URL.createObjectURL(file);
      if (this.uploadPreviewType === 'pdf') {
        this.uploadSafePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          this.uploadPreviewUrl,
        );
      }
    }

    if (!this.uploadData.name) {
      const lastDot = file.name.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
      this.uploadData.name = nameWithoutExt;
    }
  }

  clearSelectedUploadFile(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.revokeUploadPreview();
    this.selectedFile = null;
  }

  private revokeUploadPreview(): void {
    if (this.uploadPreviewUrl) {
      URL.revokeObjectURL(this.uploadPreviewUrl);
      this.uploadPreviewUrl = null;
    }
    this.uploadSafePdfUrl = null;
    this.uploadPreviewType = 'other';
  }

  private setEditFile(file: File): void {
    if (!this.isFileAccepted(file)) {
      this.errorMessage = `Formato não suportado (.${this.getFileExtension(file.name) || 'desconhecido'}). Formatos aceitos: PNG, JPG, JPEG, WEBP, GIF, BMP, PDF, TXT, DOCX, XLSX, PPTX e CSV.`;
      return;
    }

    const currentBytes = this.editingDoc?.fileSize ? Number(this.editingDoc.fileSize) || 0 : 0;
    if (!this.hasEnoughStorageForFile(file, currentBytes)) {
      return;
    }

    this.errorMessage = '';
    this.revokeEditPreview();
    this.editSelectedFile = file;
    this.editPreviewType = this.getPreviewCategory(file.name);

    if (this.editPreviewType === 'image' || this.editPreviewType === 'pdf') {
      this.editPreviewUrl = URL.createObjectURL(file);
      if (this.editPreviewType === 'pdf') {
        this.editSafePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.editPreviewUrl);
      }
    }
  }

  clearSelectedEditFile(): void {
    this.revokeEditPreview();
    this.editSelectedFile = null;
  }

  private revokeEditPreview(): void {
    if (this.editPreviewUrl) {
      URL.revokeObjectURL(this.editPreviewUrl);
      this.editPreviewUrl = null;
    }
    this.editSafePdfUrl = null;
    this.editPreviewType = 'other';
  }

  // ── UPLOAD ──────────────────────────────────────────────
  openUploadModal(): void {
    if (this.isStorageLimitReached) return;
    this.uploadData = { name: '', description: '' };
    this.clearSelectedUploadFile();
    this.clearMessages();
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.clearSelectedUploadFile();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setUploadFile(input.files[0]);
      input.value = '';
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.setUploadFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  uploadDocument(): void {
    if (!this.selectedFile || !this.uploadData.name.trim()) return;

    this.isUploading = true;
    this.clearMessages();

    const request: CreateUserDocumentRequest = {
      name: this.uploadData.name.trim(),
      description: this.uploadData.description.trim(),
      file: this.selectedFile,
    };

    this.documentService.UploadDocument(request).subscribe({
      next: (res) => {
        this.isUploading = false;
        if (res.success) {
          this.closeUploadModal();
          this.showSuccess('Arquivo enviado com sucesso!');
          this.loadDocuments();
        } else {
          this.errorMessage = res.message || 'Erro ao enviar o arquivo.';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isUploading = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.errorMessage = msg;
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ── EDIÇÃO ──────────────────────────────────────────────
  openEditModal(doc: UserDocumentResponse): void {
    this.editingDoc = doc;
    this.editData = {
      name: doc.name,
      description: doc.description || '',
    };
    this.clearSelectedEditFile();
    this.clearMessages();
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingDoc = null;
    this.clearSelectedEditFile();
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setEditFile(input.files[0]);
      input.value = '';
    }
  }

  updateDocument(): void {
    if (!this.editingDoc || !this.editData.name.trim()) return;

    this.isUpdating = true;
    this.clearMessages();

    const request: UpdateUserDocumentRequest = {
      id: this.editingDoc.id,
      name: this.editData.name.trim(),
      userId: this.editingDoc.userId,
      description: this.editData.description.trim(),
      file: this.editSelectedFile as File,
    };

    this.documentService.Update(request).subscribe({
      next: (res) => {
        this.isUpdating = false;
        if (res.success) {
          this.closeEditModal();
          this.showSuccess('Documento atualizado com sucesso!');
          this.loadDocuments();
        } else {
          this.errorMessage = res.message || 'Erro ao atualizar o documento.';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isUpdating = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.errorMessage = msg;
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ── PRÉ-VISUALIZAÇÃO RÁPIDA DE ARQUIVO EXISTENTE ──────────
  openPreviewModal(doc: UserDocumentResponse): void {
    this.previewDoc = doc;
    if (this.getPreviewCategory(doc.fileName) === 'pdf' && doc.filePath) {
      this.previewDocSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(doc.filePath);
    } else {
      this.previewDocSafeUrl = null;
    }
  }

  closePreviewModal(): void {
    this.previewDoc = null;
    this.previewDocSafeUrl = null;
  }

  // ── DESATIVAÇÃO ──────────────────────────────────────────
  deleteDocument(doc: UserDocumentResponse): void {
    if (!confirm(`Deseja desativar "${doc.name}" da biblioteca?`)) return;

    this.clearMessages();

    this.documentService.Deactivate({ id: doc.id }).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSuccess('Documento desativado com sucesso.');
          this.loadDocuments();
        } else {
          this.errorMessage = res.message || 'Erro ao desativar o documento.';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.errorMessage = msg;
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ── UTILITÁRIOS & FEEDBACK ────────────────────────────────
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  getFileExtension(fileName: string): string {
    if (!fileName) return '';
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  getFileIcon(fileName: string): string {
    const ext = this.getFileExtension(fileName);
    switch (ext) {
      case 'pdf':
        return 'fa-file-pdf';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
      case 'bmp':
        return 'fa-file-image';
      case 'txt':
      case 'docx':
        return 'fa-file-lines';
      case 'xlsx':
      case 'csv':
        return 'fa-file-excel';
      case 'pptx':
        return 'fa-file-powerpoint';
      default:
        return 'fa-file';
    }
  }

  formatFileSize(bytes: string | number): string {
    const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
    if (isNaN(num) || num === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}