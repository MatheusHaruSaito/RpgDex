import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { UserService } from '../../services/user-service';
import { UserResponse } from '../../../models/userResponse';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { SkeletonComponent } from '../../components/skeleton/skeleton';

interface EditProfileForm {
  displayName: string;
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ImageCropperComponent, SkeletonComponent],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.css',
})
export class EditProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserResponse | null = null;

  editForm: EditProfileForm = {
    displayName: '',
  };

  avatarPreviewUrl: string = '';
  selectedFile: File | null = null;
  
  isInitialLoading = true; // Estado de carregamento dos dados iniciais do utilizador
  isLoading = false;        // Estado de envio/guardar formulário
  errorMessage = '';
  successMessage = '';

  imageChangedEvent: Event | null = null;
  croppedImageBase64: string = '';
  showCropperModal = false;

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.isInitialLoading = true;
    this.authService.GetLoggedUser().subscribe({
      next: (response) => {
        this.currentUser = response.data ?? null;
        this.editForm.displayName = this.currentUser?.displayName ?? '';
        this.avatarPreviewUrl = this.currentUser?.iconPath ?? '';
        this.isInitialLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar os dados do perfil.';
        this.isInitialLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private isDisplayNameValid(displayName: string): { valid: boolean; error?: string } {
    const trimmed = displayName.trim();
    const reservedWords = ['system', 'admin', 'rpgdex'];

    if (!trimmed) {
      return { valid: false, error: 'O nome de exibição não pode ficar vazio.' };
    }

    if (trimmed.length < 1 || trimmed.length > 32) {
      return { valid: false, error: 'O nome de exibição deve ter entre 1 e 32 caracteres.' };
    }

    if (reservedWords.some((word) => trimmed.toLowerCase().includes(word))) {
      return { valid: false, error: 'O nome de exibição contém palavras reservadas.' };
    }

    return { valid: true };
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'A imagem deve ter no máximo 2MB.';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.imageChangedEvent = event;
    this.showCropperModal = true;
  }

  imageCropped(event: ImageCroppedEvent): void {
    if (event.objectUrl && event.blob) {
      this.croppedImageBase64 = event.objectUrl;
      this.selectedFile = new File([event.blob], 'avatar.png', { type: 'image/png' });
    }
  }

  confirmCrop(): void {
    this.avatarPreviewUrl = this.croppedImageBase64;
    this.showCropperModal = false;
  }

  cancelCrop(): void {
    this.imageChangedEvent = null;
    this.showCropperModal = false;
  }

  saveChanges(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const trimmedDisplayName = this.editForm.displayName.trim();

    // Validação do displayName
    const validation = this.isDisplayNameValid(trimmedDisplayName);
    if (!validation.valid) {
      this.errorMessage = validation.error!;
      return;
    }

    const formData = new FormData();
    formData.append('displayName', trimmedDisplayName);
    if (this.selectedFile) {
      formData.append('icon', this.selectedFile, this.selectedFile.name);
    }

    this.isLoading = true;
    this.userService.Update(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Perfil atualizado com sucesso!';
        this.selectedFile = null;

        this.authService.GetLoggedUser().subscribe();

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'Erro ao salvar alterações. Tente novamente.';
        this.cdr.detectChanges();
      },
    });
  }
}