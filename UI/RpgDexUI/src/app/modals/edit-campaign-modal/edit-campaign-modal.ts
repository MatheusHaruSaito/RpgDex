import { Component, Input, Output, EventEmitter, ChangeDetectorRef, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { Campaign } from '../../../models/campaign';

@Component({
  selector: 'app-edit-campaign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent],
  templateUrl: './edit-campaign-modal.html',
  styleUrls: ['./edit-campaign-modal.css']
})
export class EditCampaignModalComponent implements OnChanges {
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Input() campaign?: Campaign;

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSave = new EventEmitter<FormData>();

  editTitle = '';
  editDescription = '';
  editMaxPlayers = 4;
  editNextSession = '';
  editNewPassword = '';
  showNewPassword = false;
  editIconFile: File | null = null;
  editCoverPreview = '';
  currentIconPath = '';

  // Estados do Cropper
  imageChangedEvent: Event | null = null;
  croppedImageBlob: Blob | null = null;
  showCropperModal = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['campaign'] && this.campaign) {
      this.editTitle = this.campaign.title;
      this.editDescription = this.campaign.description ?? '';
      this.editMaxPlayers = this.campaign.maxPlayers;
      this.currentIconPath = this.campaign.iconPath ?? '';
      this.editNewPassword = '';
      this.showNewPassword = false;
      this.editNextSession = this.campaign.nextSession
        ? new Date(this.campaign.nextSession).toISOString().slice(0, 16)
        : '';
    }
  }

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.editCoverPreview = '';
    this.editIconFile = null;
    this.editNewPassword = '';
    this.showNewPassword = false;
    this.showCropperModal = false;
  }

  togglePasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  validateMaxPlayers(): void {
    if (this.editMaxPlayers < 1) this.editMaxPlayers = 1;
    if (this.editMaxPlayers > 20) this.editMaxPlayers = 20;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageChangedEvent = event;
      this.showCropperModal = true;
    }
  }

  imageCropped(event: ImageCroppedEvent): void {
    this.croppedImageBlob = event.blob ?? null;
  }

  confirmCrop(): void {
    if (this.croppedImageBlob) {
      this.editIconFile = new File([this.croppedImageBlob], 'cover.png', { type: 'image/png' });
      this.editCoverPreview = URL.createObjectURL(this.croppedImageBlob);
    }
    this.showCropperModal = false;
  }

  cancelCrop(): void {
    this.showCropperModal = false;
    this.imageChangedEvent = null;
    this.croppedImageBlob = null;
  }

  submitSave(): void {
    if (!this.campaign || !this.editTitle) return;

    const form = new FormData();
    form.append('id', this.campaign.id);
    form.append('title', this.editTitle.substring(0, 60));
    form.append('description', this.editDescription ? this.editDescription.substring(0, 1000) : '');
    form.append('maxPlayers', this.editMaxPlayers.toString());
    form.append('nextSession', this.editNextSession ? new Date(this.editNextSession).toISOString() : '');
    form.append('newPassword', this.editNewPassword ? this.editNewPassword.trim() : '');

    if (this.editIconFile) {
      form.append('icon', this.editIconFile, this.editIconFile.name);
    }

    this.onSave.emit(form);
    this.close();
  }
}