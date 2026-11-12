import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../models/character';
import { CharacterPropertyValueEnum } from '../../../models/CharacterPropertyValueEnum';

export type ResourceLevel = 'ok' | 'warn' | 'low';

export interface ViewEntry {
  key: string;
  value: string;
  type: CharacterPropertyValueEnum;
  /** Preenchidos apenas para ResourceBar */
  current?: number;
  max?: number;
  percent?: number;
  level?: ResourceLevel;
}

export interface ViewGroup {
  title: string;
  entries: ViewEntry[];
}

@Component({
  selector: 'app-character-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-viewer.html',
  styleUrls: ['./character-viewer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterViewerComponent implements OnChanges {
  @Input() character?: Character;

  readonly PropertyValueEnum = CharacterPropertyValueEnum;

  /** Calculado uma única vez por mudança de @Input (antes era recalculado a cada ciclo de detecção). */
  groups: ViewGroup[] = [];

  descExpanded = signal(false);
  readonly DESC_LIMIT = 220;

  private readonly GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  ngOnChanges(): void {
    this.groups = this.buildGroups((this.character as any)?.properties);
    this.descExpanded.set(false);
  }

  get hasLongDescription(): boolean {
    return (this.character?.description?.length ?? 0) > this.DESC_LIMIT;
  }

  toggleDescription(): void {
    this.descExpanded.update((v) => !v);
  }

  isTrue(val: string): boolean {
    return val === 'true' || val === '1';
  }

  // ── PARSER (mesmo contrato de dados do character-editor) ──
  private buildGroups(props: any): ViewGroup[] {
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

  private extractEntries(val: any): ViewEntry[] {
    const raw: { key: string; value: string; type: CharacterPropertyValueEnum }[] = [];
    this.walkNode(val, '', raw, val?.type ?? val?.Type);
    return raw.filter((e) => e.key.trim()).map((e) => this.enrich(e));
  }

  private walkNode(
    node: any,
    parentKey: string,
    out: { key: string; value: string; type: CharacterPropertyValueEnum }[],
    inheritedType?: CharacterPropertyValueEnum,
  ): void {
    if (node === null || node === undefined) return;

    const currentType =
      node?.type ?? node?.Type ?? inheritedType ?? CharacterPropertyValueEnum.ValueKey;

    if (typeof node !== 'object') {
      if (parentKey) out.push({ key: parentKey, value: String(node), type: currentType });
      return;
    }

    if (Array.isArray(node)) {
      for (const i of node) this.walkNode(i, parentKey, out, currentType);
      return;
    }

    if ('Name' in node || 'Value' in node || 'name' in node || 'value' in node) {
      out.push({
        key: String((node.Name ?? node.name ?? parentKey) || 'Atributo'),
        value: String(node.Value ?? node.value ?? ''),
        type: currentType,
      });
      return;
    }

    for (const [k, v] of Object.entries(node)) {
      if (k === 'title' || k === 'type' || k === 'Type') continue;
      this.walkNode(v, k, out, currentType);
    }
  }

  private enrich(e: { key: string; value: string; type: CharacterPropertyValueEnum }): ViewEntry {
    if (e.type !== CharacterPropertyValueEnum.ResourceBar) return e;

    const [c, m] = (e.value || '0/0').split('/');
    const current = parseInt(c || '0', 10) || 0;
    const max = parseInt(m || '0', 10) || 0;
    const percent = max > 0 ? Math.min(Math.max((current / max) * 100, 0), 100) : 0;
    const level: ResourceLevel = percent <= 25 ? 'low' : percent <= 50 ? 'warn' : 'ok';
    return { ...e, current, max, percent, level };
  }
}