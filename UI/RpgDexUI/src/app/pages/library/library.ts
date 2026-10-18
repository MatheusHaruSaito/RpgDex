import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UserDocumentService } from '../../services/user-document-service';
import { UserDocumentResponse } from '../../../models/userDocumentResponse';
import { CreateUserDocumentRequest } from '../../../models/createUserDocumentRequest';
import { UpdateUserDocumentRequest } from '../../../models/updateUserDocumentRequest';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class LibraryComponent implements OnInit {
  private documentService = inject(UserDocumentService);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);

  documents: UserDocumentResponse[] = [];
  filteredDocuments: UserDocumentResponse[] = [];

  isLoading = false;
  isUploading = false;
  isUpdating = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  activeFilter: 'all' | 'pdf' | 'image' | 'doc' | 'audio' = 'all';
  viewMode: 'grid' | 'list' = 'grid';

  // Modal Upload
  showUploadModal = false;
  selectedFile: File | null = null;
  uploadData = { name: '', description: '' };

  // Modal Edição
  showEditModal = false;
  editingDoc: UserDocumentResponse | null = null;
  editData = { name: '', description: '' };
  editSelectedFile: File | null = null;

  // Modal Pré-visualização
  previewDoc: UserDocumentResponse | null = null;
  previewSafeUrl: SafeResourceUrl | null = null;

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.clearMessages();

    this.documentService.GetAllByUserId(1, 100).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.documents = res.data;
          this.applyFilters();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Erro ao carregar arquivos da biblioteca.';
        this.cdr.detectChanges();
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
          doc.fileName?.toLowerCase().includes(term)
      );
    }

    if (this.activeFilter !== 'all') {
      result = result.filter((doc) => this.getFileCategory(doc.fileName) === this.activeFilter);
    }

    this.filteredDocuments = result;
  }

  setFilter(category: 'all' | 'pdf' | 'image' | 'doc' | 'audio'): void {
    this.activeFilter = category;
    this.applyFilters();
  }

  // ── PRÉ-VISUALIZAÇÃO ────────────────────────────────────
  openPreviewModal(doc: UserDocumentResponse): void {
    this.previewDoc = doc;
    // Torna a URL segura para o Iframe interpretar PDFs
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(doc.filePath);
  }

  closePreviewModal(): void {
    this.previewDoc = null;
    this.previewSafeUrl = null;
  }

  // ── UPLOAD ──────────────────────────────────────────────
  openUploadModal(): void {
    this.uploadData = { name: '', description: '' };
    this.selectedFile = null;
    this.clearMessages();
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      if (!this.uploadData.name) {
        const nameWithoutExt = this.selectedFile.name.substring(0, this.selectedFile.name.lastIndexOf('.'));
        this.uploadData.name = nameWithoutExt || this.selectedFile.name;
      }
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      if (!this.uploadData.name) {
        const nameWithoutExt = this.selectedFile.name.substring(0, this.selectedFile.name.lastIndexOf('.'));
        this.uploadData.name = nameWithoutExt || this.selectedFile.name;
      }
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
        this.errorMessage = err?.error?.message || 'Falha no envio do documento.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── EDIÇÃO ──────────────────────────────────────────────
  openEditModal(doc: UserDocumentResponse, event?: Event): void {
    event?.stopPropagation(); // Impede abrir o Preview ao clicar no botão de editar
    this.editingDoc = doc;
    this.editData = {
      name: doc.name,
      description: doc.description || '',
    };
    this.editSelectedFile = null;
    this.clearMessages();
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingDoc = null;
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.editSelectedFile = input.files[0];
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
        this.errorMessage = err?.error?.message || 'Erro ao salvar alterações.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── DESATIVAÇÃO ──────────────────────────────────────────
  deleteDocument(doc: UserDocumentResponse, event?: Event): void {
    event?.stopPropagation();
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
        this.errorMessage = err?.error?.message || 'Erro ao desativar o arquivo.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── UTILITÁRIOS ──────────────────────────────────────────
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

  getFileCategory(fileName: string): 'image' | 'audio' | 'pdf' | 'doc' | 'other' {
    const ext = this.getFileExtension(fileName);
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'doc';
    return 'other';
  }

  getFileIcon(fileName: string): string {
    const cat = this.getFileCategory(fileName);
    switch (cat) {
      case 'pdf': return 'fa-file-pdf';
      case 'image': return 'fa-file-image';
      case 'doc': return 'fa-file-lines';
      case 'audio': return 'fa-file-audio';
      default: return 'fa-file';
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