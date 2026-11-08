import { Component, Input, Output, EventEmitter, ChangeDetectorRef, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { TranslateService } from '@ngx-translate/core';
import { Campaign } from '../../../models/campaign';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-edit-campaign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent],
  templateUrl: './edit-campaign-modal.html',
  styleUrls: ['./edit-campaign-modal.css']
})
export class EditCampaignModalComponent implements OnChanges {
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  @Input() isOpen = false;
  @Input() campaign?: Campaign;

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSave = new EventEmitter<FormData>();

  editTitle = '';
  editDescription = '';
  editMaxPlayers = 4;
  editNextSession = '';
  editIconFile: File | null = null;
  editCoverPreview = '';
  currentIconPath = '';
  errorMessage = '';

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
      this.editNextSession = this.campaign.nextSession
        ? new Date(this.campaign.nextSession).toISOString().slice(0, 16)
        : '';
      this.errorMessage = '';
    }
  }

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.editCoverPreview = '';
    this.editIconFile = null;
    this.errorMessage = '';
    this.showCropperModal = false;
  }

  public setErrorMessage(msg: string): void {
    this.errorMessage = msg;
    this.cdr.detectChanges();
  }

  public handleError(err: any): void {
    ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
      this.setErrorMessage(msg);
    });
  }

  validateMaxPlayers(): void {
    if (this.editMaxPlayers < 1) this.editMaxPlayers = 1;
    if (this.editMaxPlayers > 20) this.editMaxPlayers = 20;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.setErrorMessage('A imagem deve ter no máximo 5MB.');
        return;
      }
      this.errorMessage = '';
      this.imageChangedEvent = event;
      this.showCropperModal = true;
      this.cdr.detectChanges();
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
    this.imageChangedEvent = null;
    this.cdr.detectChanges();
  }

  cancelCrop(): void {
    this.showCropperModal = false;
    this.imageChangedEvent = null;
    this.croppedImageBlob = null;
    this.cdr.detectChanges();
  }

  submitSave(): void {
    if (!this.campaign || !this.editTitle.trim()) return;
    this.errorMessage = '';

    const form = new FormData();
    form.append('id', this.campaign.id);
    form.append('title', this.editTitle.trim().substring(0, 60));
    form.append('description', this.editDescription ? this.editDescription.trim().substring(0, 1000) : '');
    form.append('maxPlayers', this.editMaxPlayers.toString());
    form.append('nextSession', this.editNextSession ? new Date(this.editNextSession).toISOString() : '');

    if (this.editIconFile) {
      form.append('icon', this.editIconFile, this.editIconFile.name);
    }

    this.onSave.emit(form);
  }
}