import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { finalize, firstValueFrom } from 'rxjs';
import { CharacterService } from '../../services/character-service';
import { Character } from '../../../models/character';
import { HttpClient } from '@angular/common/http';
import { CharacterPropertyValueEnum } from '../../../models/CharacterPropertyValueEnum';

export interface AttrEntry {
  key: string;
  value: string;
  type?: CharacterPropertyValueEnum;
}
export interface AttrGroup {
  title: string;
  entries: AttrEntry[];
}

@Component({
  selector: 'app-character-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent],
  templateUrl: './character-editor.html',
  styleUrl: './character-editor.css',
})
export class CharacterEditor implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private characterService = inject(CharacterService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);

  character: Character | null = null;
  editForm = { name: '', description: '' };
  groups: AttrGroup[] = [];
  showCropperModal = false;
  imageChangedEvent: Event | null = null;
  croppedBlob: Blob | null = null;
  PropertyValueEnum = CharacterPropertyValueEnum;
  private savedState: { editForm: { name: string; description: string }; groups: AttrGroup[] } = {
    editForm: { name: '', description: '' },
    groups: [],
  };

  private captureSavedState(): void {
    this.savedState = JSON.parse(JSON.stringify({ editForm: this.editForm, groups: this.groups }));
  }

  selectedIconFile: File | null = null;
  iconPreviewUrl = '';
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  isEditing = false;

  private readonly GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/personagens']);
      return;
    }
    this.loadCharacter(id);
  }

  constructor(private http: HttpClient) {}
  private loadCharacter(id: string): void {
    this.characterService.GetById(id).subscribe({
      next: (res) => {
        this.character = res.data ?? null;
        if (!this.character) {
          this.router.navigate(['/personagens']);
          return;
        }
        this.editForm = {
          name: this.character.name,
          description: this.character.description ?? '',
        };
        this.groups = this.buildGroups((this.character as any).properties);
        this.selectedIconFile = null;
        this.iconPreviewUrl = '';
        this.captureSavedState();
        this.characterService.PatchLastAccess(id).subscribe();
        this.cdr.detectChanges();
        console.log(this.character);
      },
      error: () => this.router.navigate(['/personagens']),
    });
  }

  get hasUnsavedChanges(): boolean {
    const current = JSON.stringify({ editForm: this.editForm, groups: this.groups });
    const saved = JSON.stringify(this.savedState);
    return current !== saved || !!this.selectedIconFile;
  }
  getPropertyCssClass(type: CharacterPropertyValueEnum): string {
    switch (type) {
      case CharacterPropertyValueEnum.BooleanFlgs:
        return 'ce-prop-boolean-flags';
      case CharacterPropertyValueEnum.ValueKey:
      default:
        return 'ce-prop-text-ValueKey';
    }
  }

  toggleEditMode(): void {
    if (this.isEditing) {
      if (this.hasUnsavedChanges) {
        const confirmed = confirm('Você tem alterações não salvas. Deseja descartar?');
        if (!confirmed) return;
      }

      this.editForm = JSON.parse(JSON.stringify(this.savedState.editForm));
      this.groups = JSON.parse(JSON.stringify(this.savedState.groups));
      this.selectedIconFile = null;
      this.iconPreviewUrl = '';
      this.errorMessage = '';
    }
    this.isEditing = !this.isEditing;
  }

  private buildGroups(props: any): AttrGroup[] {
    if (!props || typeof props !== 'object') return [];
    return Object.entries(props).map(([rawKey, val]) => ({
      title: this.cleanKey(rawKey, val),
      entries: this.extractEntries(val),
    }));
  }

  private cleanKey(rawKey: string, node: any): string {
    if (node && typeof node === 'object' && !Array.isArray(node) && node.title)
      return String(node.title);
    if (this.GUID_RE.test(rawKey)) return 'Grupo';
    return rawKey.replace(/_[0-9a-f-]{36}$/i, '').trim() || rawKey;
  }

  private extractEntries(val: any): AttrEntry[] {
    const out: AttrEntry[] = [];
    const inheritType = val.type;
    this.walkNode(val, '', out, inheritType);
    return out;
  }

  private walkNode(
    node: any,
    parentKey: string,
    out: AttrEntry[],
    inheritedType?: CharacterPropertyValueEnum,
  ): void {
    if (node === null || node === undefined) return;

    // Atualiza o tipo herdado se o nó atual possuir um próprio
    const currentType = node?.type ?? node?.Type ?? inheritedType;

    if (typeof node !== 'object') {
      if (parentKey) {
        out.push({
          key: parentKey,
          value: String(node),
          type: currentType,
        });
      }
      return;
    }

    if (Array.isArray(node)) {
      for (const i of node) this.walkNode(i, parentKey, out, currentType);
      return;
    }

    if ('Name' in node || 'Value' in node) {
      out.push({
        key: String((node.Name ?? node.name ?? parentKey) || 'Atributo'),
        value: String(node.Value ?? node.value ?? ''),
        type: currentType,
      });
      return;
    }

    if ('data' in node) {
      const childKey = node.title ? String(node.title) : parentKey;
      const data = node.data;

      if (Array.isArray(data) && data.length > 0) {
        for (const c of data) this.walkNode(c, childKey, out, currentType);
        return;
      }

      if (data && typeof data === 'object') {
        if ('value' in data) {
          out.push({
            key: childKey,
            value: String(data['value'] ?? ''),
            type: data.type ?? data.Type ?? currentType,
          });
          return;
        }

        for (const [k, v] of Object.entries(data)) {
          this.walkNode(v, k, out, currentType);
        }
        return;
      }

      if (childKey) {
        out.push({
          key: childKey,
          value: String(data ?? ''),
          type: currentType,
        });
      }
      return;
    }

    for (const [k, v] of Object.entries(node)) {
      this.walkNode(v, k, out, currentType);
    }
  }
  // ── Grupos ─────────────────────────────────────────────
  addGroup(): void {
    this.groups.push({ title: '', entries: [] });
  }
  removeGroup(i: number): void {
    this.groups.splice(i, 1);
  }
  addEntry(g: AttrGroup): void {
    //Change this later, this is just for testing
    const value = CharacterPropertyValueEnum.BooleanFlgs;
    g.entries.push({ key: '', value: '', type: value });
  }
  removeEntry(g: AttrGroup, i: number): void {
    g.entries.splice(i, 1);
  }

  onIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'A imagem deve ter no máximo 5MB.';
      return;
    }

    this.errorMessage = '';
    this.imageChangedEvent = event;
    this.showCropperModal = true;
  }

  imageCropped(event: ImageCroppedEvent): void {
    if (event.blob) {
      this.croppedBlob = event.blob;
    }
    if (event.objectUrl) {
      this.iconPreviewUrl = event.objectUrl;
    }
  }

  confirmCrop(): void {
    if (this.croppedBlob) {
      this.selectedIconFile = new File([this.croppedBlob], 'avatar.webp', {
        type: 'image/webp',
      });
    }
    this.showCropperModal = false;
    this.imageChangedEvent = null;
    this.cdr.detectChanges();
  }

  cancelCrop(): void {
    this.showCropperModal = false;
    this.imageChangedEvent = null;
    this.croppedBlob = null;
  }

  Save(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.editForm.name.trim()) {
      this.errorMessage = 'O nome do personagem é obrigatório.';
      return;
    }

    const propertiesObj: Record<string, any> = {};
    for (const group of this.groups) {
      const key = group.title.trim() || 'Grupo';
      propertiesObj[key] = group.entries
        .filter((e) => e.key.trim())
        .map((e) => ({ Name: e.key.trim(), Value: e.value, Type: e.type }));
    }

    const form = new FormData();
    form.append('id', this.character!.id);
    form.append('name', this.editForm.name.trim());
    form.append('description', this.editForm.description ?? '');
    form.append('properties', JSON.stringify(propertiesObj));
    if (this.selectedIconFile) {
      form.append('icon', this.selectedIconFile, this.selectedIconFile.name);
    }

    this.isSaving = true;

    this.characterService
      .Update(form as any)
      .pipe(
        finalize(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.character = {
            ...this.character!,
            name: this.editForm.name.trim(),
            description: this.editForm.description,
            iconPath: this.iconPreviewUrl || this.character!.iconPath,
          };

          this.captureSavedState();
          this.selectedIconFile = null;
          this.isEditing = false;
          this.successMessage = 'Personagem salvo com sucesso!';

          this.captureSavedState();
          this.selectedIconFile = null;

          this.isEditing = false;
          this.successMessage = 'Personagem salvo com sucesso!';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err) => {
          this.isSaving = false;
          const body = err?.error;
          this.errorMessage =
            (body?.errors ? (Object.values(body.errors).flat() as string[])[0] : null) ??
            body?.message ??
            body?.title ??
            'Erro ao salvar.';
          this.cdr.detectChanges();
        },
      });
  }

  confirmDelete(): void {
    if (!confirm('Tem certeza que deseja excluir este personagem? Esta ação é irreversível.'))
      return;
    this.characterService.Delete(this.character!.id).subscribe({
      next: () => this.router.navigate(['/personagens']),
      error: () => {
        this.errorMessage = 'Erro ao excluir personagem.';
      },
    });
  }

  goBack(): void {
    if (this.isEditing && this.hasUnsavedChanges) {
      if (!confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) return;
    }
    this.location.back();
  }
  async downloadCharacter(): Promise<void> {
    const characterJson = JSON.stringify(
      await this.formatCharacterToDownload(this.character!),
      null,
      2,
    );
    const blob = new Blob([characterJson], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.character?.name.toLocaleLowerCase().replace(/ /g, '+')}_data.json`;

    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  private async formatCharacterToDownload(character: Character) {
    return {
      icon: await this.convertImageToBase64(character.iconPath),
      name: character.name,
      description: character.description,
      properties: character.properties,
    };
  }
  private async convertImageToBase64(url: string): Promise<string> {
    if (!url) return '';

    try {
      const response: any = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));

      const blob: Blob =
        response instanceof Blob ? response : response?.body instanceof Blob ? response.body : null;

      if (!(blob instanceof Blob)) {
        console.warn('A resposta da imagem não é um Blob válido:', response);
        return '';
      }
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const webpBase64 = canvas.toDataURL('image/webp', 0.8);
            URL.revokeObjectURL(objectUrl);
            resolve(webpBase64);
          } else {
            URL.revokeObjectURL(objectUrl);
            reject('Não foi possível obter o contexto do canvas');
          }
        };

        img.onerror = (err) => {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        };

        img.src = objectUrl;
      });
    } catch (err) {
      console.error('Erro ao converter imagem para WebP Base64:', err);
      return '';
    }
  }
}
