import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
      result = result.filter((doc) => {
        const ext = this.getFileExtension(doc.fileName);
        if (this.activeFilter === 'pdf') return ext === 'pdf';
        if (this.activeFilter === 'image') return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
        if (this.activeFilter === 'doc') return ['doc', 'docx', 'txt', 'rtf'].includes(ext);
        if (this.activeFilter === 'audio') return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
        return true;
      });
    }

    this.filteredDocuments = result;
  }

  setFilter(category: 'all' | 'pdf' | 'image' | 'doc' | 'audio'): void {
    this.activeFilter = category;
    this.applyFilters();
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
  openEditModal(doc: UserDocumentResponse): void {
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
        this.errorMessage = err?.error?.message || 'Erro ao desativar o arquivo.';
        this.cdr.detectChanges();
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
        return 'fa-file-image';
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
        return 'fa-file-lines';
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'm4a':
        return 'fa-file-audio';
      case 'zip':
      case 'rar':
      case '7z':
        return 'fa-file-zipper';
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