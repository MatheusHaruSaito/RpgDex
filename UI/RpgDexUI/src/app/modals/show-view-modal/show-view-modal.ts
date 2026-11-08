import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Character } from '../../../models/character';
import { CharacterService } from '../../services/character-service';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-show-view-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './show-view-modal.html',
  styleUrl: './show-view-modal.css',
})
export class ShowViewModal implements OnChanges {
  @Input() visible = false;
  @Input() characterId = '';
  @Output() close = new EventEmitter<void>();

  private characterService = inject(CharacterService);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  viewCharacter: Character | any = null;
  isLoading = false;
  errorMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true && this.characterId) {
      this.ShowCharacter();
    }
  }

  ShowCharacter(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.viewCharacter = null;

    this.characterService.GetById(this.characterId).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.viewCharacter = res.data ?? null;
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

  CloseViewModal(): void {
    this.close.emit();
    this.viewCharacter = null;
    this.errorMessage = '';
    this.isLoading = false;
  }

  private readonly GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private cleanKey(key: string): string {
    if (this.GUID_RE.test(key)) return 'Grupo';
    const cleaned = key.replace(
      /_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ''
    );
    return cleaned.trim() || 'Atributo';
  }

  private flattenProperties(
    node: any,
    pathLabel: string,
    out: { key: string; value: any }[]
  ): void {
    if (node && typeof node === 'object' && !Array.isArray(node) && ('Name' in node || 'Value' in node)) {
      const label = node.Name ? `${pathLabel} > ${node.Name}` : pathLabel;
      out.push({ key: label.replace(/^ > /, ''), value: node.Value ?? '' });
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        this.flattenProperties(item, pathLabel, out);
      }
      return;
    }

    if (node && typeof node === 'object') {
      const entries = Object.entries(node);
      for (const [rawKey, value] of entries) {
        const label = this.cleanKey(rawKey);
        const nextPath = pathLabel ? `${pathLabel} > ${label}` : label;

        if (value === null || typeof value === 'object') {
          this.flattenProperties(value, nextPath, out);
        } else {
          out.push({ key: nextPath, value });
        }
      }
      return;
    }

    if (node !== null && node !== undefined && node !== '') {
      out.push({ key: pathLabel || 'Atributo', value: node });
    }
  }

  viewPropertiesEntries(): { key: string; value: any }[] {
    const props = (this.viewCharacter as any)?.properties;
    if (!props || typeof props !== 'object') return [];

    const out: { key: string; value: any }[] = [];
    for (const [rawKey, value] of Object.entries(props)) {
      const label = this.cleanKey(rawKey);
      this.flattenProperties(value, label, out);
    }
    return out;
  }
}