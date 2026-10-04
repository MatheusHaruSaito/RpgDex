import { Component, EventEmitter, Input, Output, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-create-join-campaign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent],
  templateUrl: './create-join-campaign-modal.html',
  styleUrls: ['./create-join-campaign-modal.css']
})
export class CreateJoinCampaignModalComponent {
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Input() activeTab: 'create' | 'join' = 'create';
  @Input() errorMessage: string = '';

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onCreate = new EventEmitter<FormData>();
  @Output() onJoin = new EventEmitter<{ campaignId: string; password?: string }>();

  // Campos de Criação
  newTitle = '';
  newDescription = '';
  newPassword = '';
  newMaxPlayers = 4;
  selectedIconFile: File | null = null;
  coverPreviewUrl = '';

  // Campos de Entrada
  joinId = '';
  joinPassword = '';

  // Estados do Cropper
  imageChangedEvent: Event | null = null;
  croppedImageBlob: Blob | null = null;
  showCropperModal = false;

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.resetForm();
  }

  public setErrorMessage(msg: string): void {
    this.errorMessage = msg;
    this.cdr.detectChanges();
  }

  validateMaxPlayers(): void {
    if (this.newMaxPlayers < 1) this.newMaxPlayers = 1;
    if (this.newMaxPlayers > 20) this.newMaxPlayers = 20;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageChangedEvent = event;
      this.showCropperModal = true;
      this.cdr.detectChanges();
    }
  }

  imageCropped(event: ImageCroppedEvent): void {
    if (event.blob) {
      this.croppedImageBlob = event.blob;
    }
  }

  confirmCrop(): void {
    if (this.croppedImageBlob) {
      this.selectedIconFile = new File([this.croppedImageBlob], 'cover.png', { type: 'image/png' });
      this.coverPreviewUrl = URL.createObjectURL(this.croppedImageBlob);
    }
    this.showCropperModal = false;
    this.imageChangedEvent = null;
    this.cdr.detectChanges();
  }

  cancelCrop(): void {
    this.showCropperModal = false;
    this.imageChangedEvent = null;
    this.croppedImageBlob = null;
    this.cdr.detectChanges();
  }

  submitCreate(): void {
    if (!this.newTitle || !this.selectedIconFile) return;
    this.errorMessage = '';

    const form = new FormData();
    form.append('title', this.newTitle.substring(0, 60));
    form.append('maxPlayers', this.newMaxPlayers.toString());
    form.append('icon', this.selectedIconFile, this.selectedIconFile.name);
    form.append('nextSession', new Date('1999-01-01T00:00:00').toISOString());
    if (this.newDescription) form.append('description', this.newDescription.substring(0, 1000));
    if (this.newPassword) form.append('password', this.newPassword.substring(0, 50));

    this.onCreate.emit(form);
  }

  submitJoin(): void {
    if (!this.joinId) return;
    this.errorMessage = '';

    this.onJoin.emit({
      campaignId: this.joinId.trim().substring(0, 100),
      password: this.joinPassword ? this.joinPassword.substring(0, 50) : undefined
    });
  }

  private resetForm(): void {
    this.newTitle = '';
    this.newDescription = '';
    this.newPassword = '';
    this.newMaxPlayers = 4;
    this.selectedIconFile = null;
    this.coverPreviewUrl = '';
    this.joinId = '';
    this.joinPassword = '';
    this.errorMessage = '';
    this.showCropperModal = false;
    this.imageChangedEvent = null;
    this.croppedImageBlob = null;
  }
}