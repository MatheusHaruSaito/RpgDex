import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CharacterService } from '../../services/character-service';
import { AuthService } from '../../services/auth-service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { TranslateService } from '@ngx-translate/core';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-create-character-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent],
  templateUrl: './create-character-modal.html',
  styleUrl: './create-character-modal.css',
})
export class CreateCharacterModal implements OnInit {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private characterService = inject(CharacterService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  isLoading = false;
  errorMessage = '';
  newCharacter = { name: '', description: '' };

  selectedIconFile: File | null = null;
  iconPreviewUrl = '';
  imageChangedEvent: Event | null = null;
  croppedImageBase64: string = '';
  showCropperModal = false;

  ngOnInit(): void {}

  private reset(): void {
    this.newCharacter = { name: '', description: '' };
    this.selectedIconFile = null;
    this.iconPreviewUrl = '';
    this.imageChangedEvent = null;
    this.croppedImageBase64 = '';
    this.showCropperModal = false;
    this.errorMessage = '';
  }

  CloseModal(): void {
    this.reset();
    this.close.emit();
  }

  onIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'A imagem deve ter no máximo 2MB.';
      return;
    }

    this.errorMessage = '';
    this.imageChangedEvent = event;
    this.showCropperModal = true;
  }

  imageCropped(event: ImageCroppedEvent): void {
    if (event.objectUrl && event.blob) {
      this.croppedImageBase64 = event.objectUrl;
      this.selectedIconFile = new File([event.blob], 'avatar.png', { type: 'image/png' });
    }
  }

  confirmCrop(): void {
    this.iconPreviewUrl = this.croppedImageBase64;
    this.showCropperModal = false;
  }

  cancelCrop(): void {
    this.imageChangedEvent = null;
    this.showCropperModal = false;
  }

  CreateCharacter(): void {
    this.errorMessage = '';
    if (!this.newCharacter.name.trim()) {
      this.translateService.get('ERRORS.VALIDATION_DISPLAYNAME').subscribe((res: string) => {
        this.errorMessage = res !== 'ERRORS.VALIDATION_DISPLAYNAME' ? res : 'Informe o nome do personagem.';
        this.cdr.detectChanges();
      });
      return;
    }

    const form = new FormData();
    form.append('name', this.newCharacter.name.trim());
    form.append('description', this.newCharacter.description ?? '');
    if (this.selectedIconFile) {
      form.append('icon', this.selectedIconFile, this.selectedIconFile.name);
    }

    this.isLoading = true;
    this.characterService.Post(form as any).subscribe({
      next: (res) => {
        this.isLoading = false;
        const id = (res as any)?.data?.id ?? (res as any)?.id;
        this.created.emit();
        this.CloseModal();
        if (id) {
          this.router.navigate(['/personagens', id]);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.errorMessage = msg;
          this.cdr.detectChanges();
        });
      },
    });
  }
}