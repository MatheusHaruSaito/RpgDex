import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { ColorEvent } from 'ngx-color';
import { ColorSketchModule } from 'ngx-color/sketch';
import { CanvasElementResponse } from '../../../models/canvasElementResponse';
import { CanvasElementType } from '../../../models/canvasElementType';
import { CanvasElementService } from '../../services/canvas-element-service';
import { CampaignService } from '../../services/campaign-service';
import { CharacterService } from '../../services/character-service';
import { Character } from '../../../models/character';
import { CreateCanvaElementRequest } from '../../../models/createCanvaElementRequest';
import { MoveCanvaElementsRequest } from '../../../models/moveCanvaElementsRequest';
import { ReOrderCanvaElementsRequest } from '../../../models/reorderCanvaElementsRequest';
import { UpdateCanvaElementRequest } from '../../../models/updateCanvaElementRequest';
import { CreateCanvaTokenElementRequest } from '../../../models/createCanvaTokenElementRequest';
import { CampaignChatComponent } from '../../components/campaign-chat-component/campaign-chat-component';
import { ScaleElementRequest } from '../../../models/scaleElementRequest';
import { AuthService } from '../../services/auth-service';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

export type ToolMode = 'cursor' | 'draw' | 'eraser';

export interface ExtendedCanvasElement extends CanvasElementResponse {
  hideName?: boolean;
  isRound?: boolean;
}

interface EraserTrailPoint {
  x: number;
  y: number;
  id: number;
}

/** id do elemento -> estado antes da ação (null = elemento criado pela ação). */
type HistoryEntry = Record<string, ExtendedCanvasElement | null>;

@Component({
  selector: 'app-campaign-canvas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ImageCropperComponent,
    CampaignChatComponent,
    ColorSketchModule,
  ],
  templateUrl: './campaign-canvas.html',
  styleUrls: ['./campaign-canvas.css'],
})
export class CampaignCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  campaignId: string = '';
  isCampaignActive: boolean = true;

  errorMessage: string | null = null;
  private errorTimeout: ReturnType<typeof setTimeout> | null = null;

  canvasElementService = inject(CanvasElementService);
  campaignService = inject(CampaignService);
  characterService = inject(CharacterService);
  authService = inject(AuthService);
  private router = inject(Router);
  private translateService = inject(TranslateService);

  public CanvasElementType = CanvasElementType;

  scale: number = 1;
  panX: number = 0;
  panY: number = 0;

  activeTool: ToolMode = 'cursor';
  brushSize: number = 4;

  isInteracting: boolean = false;
  isPanning: boolean = false;
  isCreatingElement: boolean = false;
  selectedFile: File | undefined = undefined;

  private hasDragged: boolean = false;
  private dragStartScreen = { x: 0, y: 0 };

  eraserTrail: EraserTrailPoint[] = [];

  selectedElements: ExtendedCanvasElement[] = [];
  clipboardStorage: ExtendedCanvasElement[] = [];
  selectionBox = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };

  activeDrawing: ExtendedCanvasElement | null = null;
  lastPointer = { x: 0, y: 0 };
  mouseWorldPos = { x: 0, y: 0 };
  maxZ: number = 10;

  elements: ExtendedCanvasElement[] = [];

  history: HistoryEntry[] = [];
  redoHistory: HistoryEntry[] = [];
  private readonly maxHistory = 50;

  // Estado da interação atual com ponteiro
  private activePointers = new Map<number, { x: number; y: number }>();
  private primaryPointerId: number | null = null;
  private gesture: {
    startDist: number;
    startScale: number;
    lastMidX: number;
    lastMidY: number;
  } | null = null;
  private dragBefore: HistoryEntry | null = null;
  private eraserBatch: HistoryEntry | null = null;
  private pendingSingleSelect: ExtendedCanvasElement | null = null;

  selectedColor: string = '#9E74D0';
  isColorPickerOpen: boolean = false;
  isAddMenuOpen: boolean = false;

  readonly presetColors: string[] = [
    '#9E74D0',
    '#E74C3C',
    '#F39C12',
    '#F1C40F',
    '#2ECC71',
    '#00F5FF',
    '#3498DB',
    '#FF00AA',
    '#FFFFFF',
    '#BDC3C7',
    '#636E72',
    '#1E1E24',
  ];

  isTextModalOpen: boolean = false;
  customTextContent: string = '';

  isTokenModalOpen: boolean = false;
  tokenModalTab: 'campaign' | 'custom' = 'campaign';
  isLoadingCharacters: boolean = false;
  campaignCharacters: Character[] = [];

  customTokenName: string = '';
  customTokenColor: string = '#9E74D0';
  customTokenImagePreview: string | null = null;
  customTokenFile: File | undefined = undefined;

  isCropping: boolean = false;
  isRoundCrop: boolean = false;
  tempCroppedBase64: string = '';
  cropImageSource: string = '';
  isCroppingCustomToken: boolean = false;
  croppedBlob: Blob | null = null;

  canvasSizeMb: number = 0;
  campaignStorageCapacity: number = 0;

  get storagePercentage(): number {
    if (!this.campaignStorageCapacity || this.campaignStorageCapacity <= 0) return 0;
    return Math.min(100, Math.round((this.canvasSizeMb / this.campaignStorageCapacity) * 100));
  }

  get isStorageNearLimit(): boolean {
    return this.storagePercentage >= 80 && this.canvasSizeMb < this.campaignStorageCapacity;
  }

  constructor(private route: ActivatedRoute) {}

  trackByElementId(_index: number, item: ExtendedCanvasElement): string {
    return item.id;
  }

  ngOnInit(): void {
    this.campaignId = this.route.snapshot.paramMap.get('id') ?? '';
    this.centerCamera();
    this.checkCampaignStatus();
    this.loadElements();

    this.canvasElementService
      .startConnection(this.campaignId, () => this.authService.Token)
      .catch((err) => {
        console.error('Error starting canvas connection', err);
        this.showError('Não foi possível conectar ao servidor em tempo real do tabuleiro.');
      });

    this.canvasElementService.onElementsMoved().subscribe((elements) => {
      elements.forEach((moved) => {
        const el = this.elements.find((e) => e.id === moved.id);
        // Não deixa um eco atrasado do servidor "puxar" o elemento que está sendo arrastado agora.
        if (el && !(this.hasDragged && this.selectedElements.includes(el))) {
          el.x = moved.x;
          el.y = moved.y;
        }
      });
    });

    this.canvasElementService.onElementsScaled().subscribe((elements) => {
      elements.forEach((moved) => {
        const el = this.elements.find((e) => e.id === moved.id);
        if (el) {
          el.scale = moved.scale;
        }
      });
    });

    this.canvasElementService.onElementsReOrdered().subscribe((elements) => {
      elements.forEach((reordered) => {
        const el = this.elements.find((e) => e.id === reordered.id);
        if (el) {
          el.z = reordered.z;
        }
      });
    });

    this.canvasElementService.onElementsColorChanged().subscribe(({ ids, color }) => {
      const idSet = new Set(ids);
      this.elements.forEach((el) => {
        if (idSet.has(el.id)) {
          el.color = color;
        }
      });
      this.refreshStorageUsage();
    });

    this.canvasElementService.onElementContentChanged().subscribe(({ id, content }) => {
      const element = this.elements.find((c) => c.id === id);
      if (element) {
        element.content = content;
      }
      this.refreshStorageUsage();
    });

    this.canvasElementService.onElementIsLockedStateChanged().subscribe(({ ids, state }) => {
      const idSet = new Set(ids);
      this.elements.forEach((el) => {
        if (idSet.has(el.id)) {
          el.isLocked = state;
        }
      });
    });

    this.canvasElementService.onCreateElement().subscribe((newEl) => {
      if (newEl && !this.elements.some((e) => e.id === newEl.id)) {
        const extendedEl = newEl as ExtendedCanvasElement;
        const formatted: ExtendedCanvasElement = {
          ...newEl,
          scale: Number(newEl.scale) || 1,
          imageUrl: newEl.imageUrl || (newEl as any).image || undefined,
          isRound: newEl.content === 'round' || extendedEl.isRound === true,
          isLocked: Boolean(newEl.isLocked),
        };
        this.elements.push(formatted);
        this.refreshStorageUsage();
      }
    });

    this.canvasElementService.onElementsActiveChanged().subscribe(({ ids, state }) => {
      if (!state) {
        this.elements = this.elements.filter((e) => !ids.includes(e.id));
        this.selectedElements = this.selectedElements.filter((e) => !ids.includes(e.id));
      }
      this.refreshStorageUsage();
    });
  }

  ngAfterViewInit(): void {
    this.canvasContainer?.nativeElement?.addEventListener('wheel', this.onWheel, {
      passive: false,
    });
  }

  ngOnDestroy() {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.canvasContainer?.nativeElement?.removeEventListener('wheel', this.onWheel);
    this.canvasElementService.stopConnection();
  }

  // ── MENUS FLUTUANTES (COR / ADICIONAR) ──
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (this.isColorPickerOpen && !target.closest('.color-picker-wrapper')) {
      this.isColorPickerOpen = false;
    }
    if (this.isAddMenuOpen && !target.closest('.add-menu')) {
      this.isAddMenuOpen = false;
    }
  }

  toggleColorPicker(event: Event): void {
    event.stopPropagation();
    if (!this.isCampaignActive) return;
    this.isColorPickerOpen = !this.isColorPickerOpen;
    this.isAddMenuOpen = false;
  }

  toggleAddMenu(event: Event): void {
    event.stopPropagation();
    if (!this.isCampaignActive) return;
    this.isAddMenuOpen = !this.isAddMenuOpen;
    this.isColorPickerOpen = false;
  }

  closeAddMenu(): void {
    this.isAddMenuOpen = false;
  }

  get isAnyModalOpen(): boolean {
    return this.isTextModalOpen || this.isTokenModalOpen || this.isCropping;
  }

  /** Atalhos do tabuleiro não devem disparar enquanto o usuário digita ou usa um modal. */
  private shouldIgnoreShortcut(target: EventTarget | null): boolean {
    if (this.isAnyModalOpen) return true;
    const el = target as HTMLElement | null;
    return (
      !!el &&
      (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable)
    );
  }

  handleSketchColorChange(event: ColorEvent): void {
    const hex = event.color.hex.toUpperCase();
    this.onColorChange(hex);
  }

  handleCustomTokenSketchChange(event: ColorEvent): void {
    this.customTokenColor = event.color.hex.toUpperCase();
  }

  showError(message: string): void {
    this.errorMessage = message;
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.errorTimeout = setTimeout(() => {
      this.errorMessage = null;
    }, 6000);
  }

  dismissError(): void {
    this.errorMessage = null;
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
  }

  private handleApiError(err: any): void {
    ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
      this.showError(msg);
    });
  }

  private checkCampaignStatus(): void {
    if (!this.campaignId) return;

    this.campaignService.GetById(this.campaignId).subscribe({
      next: (res) => {
        if (res.data && !res.data.isActive) {
          this.router.navigate(['/campanha', this.campaignId]);
        }
      },
      error: () => {
        this.router.navigate(['/campanha', this.campaignId]);
      },
    });
  }

  getCanvasBounds(): DOMRect {
    if (this.canvasContainer?.nativeElement) {
      return this.canvasContainer.nativeElement.getBoundingClientRect();
    }
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect;
  }

  getViewportCenterWorld(): { x: number; y: number } {
    const bounds = this.getCanvasBounds();
    const centerXScreen = bounds.left + bounds.width / 2;
    const centerYScreen = bounds.top + bounds.height / 2;
    return {
      x: this.getWorldX(centerXScreen),
      y: this.getWorldY(centerYScreen),
    };
  }

  /** Usado logo após CRIAR um elemento: sincroniza, seleciona e registra no histórico. */
  selectAndSyncElement(element: ExtendedCanvasElement, recordHistory = true): void {
    let target = this.elements.find((e) => e.id === element.id);
    if (!target) {
      target = element;
      this.elements.push(target);
    }
    this.setTool('cursor');
    this.selectedElements = [target];
    if (recordHistory) this.recordCreated([target.id]);
  }

  getElementTypeName(type: CanvasElementType): string {
    return CanvasElementType[type] || 'ELEMENTO';
  }

  hasTokenSelected(): boolean {
    return this.selectedElements.some((el) => el.elementType === CanvasElementType.Token);
  }

  areAllSelectedTokensHidden(): boolean {
    const tokens = this.selectedElements.filter((el) => el.elementType === CanvasElementType.Token);
    return tokens.length > 0 && tokens.every((t) => t.hideName);
  }

  toggleSelectedTokenNames(): void {
    if (!this.isCampaignActive || !this.hasTokenSelected()) return;
    this.saveState(this.selectedElements.filter((el) => el.elementType === CanvasElementType.Token));

    const shouldHide = !this.areAllSelectedTokensHidden();

    this.selectedElements.forEach((el) => {
      if (el.elementType === CanvasElementType.Token) {
        el.hideName = shouldHide;
        this.updateElementAPI(el);
      }
    });
  }

  areAllSelectedLocked(): boolean {
    return this.selectedElements.length > 0 && this.selectedElements.every((el) => el.isLocked);
  }

  toggleLockSelected(): void {
    if (!this.isCampaignActive || this.selectedElements.length === 0) return;
    const shouldLock = !this.areAllSelectedLocked();

    const elementsToChange = this.selectedElements.filter(
      (el) => !el.id.startsWith('temp-') && Boolean(el.isLocked) !== shouldLock,
    );
    if (elementsToChange.length === 0) return;

    this.saveState(elementsToChange);

    const ids = elementsToChange.map((el) => el.id);
    elementsToChange.forEach((el) => {
      el.isLocked = shouldLock;
    });

    const request$ = shouldLock
      ? this.canvasElementService.LockElement({ campaignId: this.campaignId, ids })
      : this.canvasElementService.UnLockElement({ campaignId: this.campaignId, ids });

    request$.subscribe({
      error: (err) => {
        console.error('[Canvas] Erro ao alterar estado de travamento:', err);
        this.handleApiError(err);
      },
    });
  }

  get visibleElements(): ExtendedCanvasElement[] {
    const bounds = this.getCanvasBounds();
    const margin = 5000 / Math.max(this.scale, 0.1);

    const minX = this.getWorldX(bounds.left) - margin;
    const maxX = this.getWorldX(bounds.left + bounds.width) + margin;
    const minY = this.getWorldY(bounds.top) - margin;
    const maxY = this.getWorldY(bounds.top + bounds.height) + margin;

    return this.elements.filter((el) => {
      if (el.elementType === CanvasElementType.Drawing) return true;

      const elScale = el.scale || 1;
      const size = 600 * elScale;

      return el.x + size >= minX && el.x <= maxX && el.y + size >= minY && el.y <= maxY;
    });
  }

  loadCampaignCharacters(): void {
    if (!this.campaignId) return;
    this.isLoadingCharacters = true;
    this.campaignCharacters = [];

    this.campaignService.GetById(this.campaignId).subscribe({
      next: (res) => {
        if (res.data) {
          this.isCampaignActive = res.data.isActive;
        }
        const charIds = res.data?.characterIds ?? [];
        if (charIds.length === 0) {
          this.isLoadingCharacters = false;
          return;
        }

        let loaded = 0;
        charIds.forEach((id) => {
          this.characterService.GetById(id).subscribe({
            next: (cRes) => {
              if (cRes.data) {
                this.campaignCharacters.push(cRes.data);
              }
              loaded++;
              if (loaded >= charIds.length) {
                this.isLoadingCharacters = false;
              }
            },
            error: (err) => {
              console.error('[Canvas] Error fetching character:', id, err);
              this.handleApiError(err);
              loaded++;
              if (loaded >= charIds.length) {
                this.isLoadingCharacters = false;
              }
            },
          });
        });
      },
      error: (err) => {
        console.error('[Canvas] Error loading campaign characters:', err);
        this.handleApiError(err);
        this.isLoadingCharacters = false;
      },
    });
  }

  openTokenModal(): void {
    if (!this.isCampaignActive) return;
    this.isTokenModalOpen = true;
    this.loadCampaignCharacters();
  }

  addCharacterToken(character: Character): void {
    if (!this.isCampaignActive || this.isCreatingElement) return;
    this.isCreatingElement = true;

    const center = this.getViewportCenterWorld();

    const req: CreateCanvaTokenElementRequest = {
      campaignId: this.campaignId,
      characterId: character.id,
      content: character.name,
      x: center.x - 25,
      y: center.y - 25,
      z: ++this.maxZ,
      scale: 1,
      color: '#9E74D0',
    };

    this.canvasElementService.CreateTokenElement(req).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectAndSyncElement(res.data);
          this.isTokenModalOpen = false;
          this.refreshStorageUsage();
        } else {
          this.showError(res.message || 'Não foi possível adicionar o token do personagem.');
        }
        this.isCreatingElement = false;
      },
      error: (err) => {
        console.error('[Canvas] Error creating character token:', err);
        this.handleApiError(err);
        this.isCreatingElement = false;
      },
    });
  }

  onCustomTokenImageSelected(event: Event): void {
    if (!this.isCampaignActive) return;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.customTokenFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.customTokenImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearCustomTokenImage(): void {
    this.customTokenImagePreview = null;
    this.customTokenFile = undefined;
    this.croppedBlob = null;
  }

  createCustomToken(): void {
    if (!this.isCampaignActive) return;

    if (!this.customTokenName.trim()) {
      this.showError('Por favor, digite um nome para o token.');
      return;
    }

    if (this.isCreatingElement) return;
    this.isCreatingElement = true;

    const center = this.getViewportCenterWorld();
    const targetX = center.x - 25;
    const targetY = center.y - 25;
    const targetZ = ++this.maxZ;
    const tokenName = this.customTokenName.trim();

    if (this.customTokenFile) {
      const formData = new FormData();
      formData.append('campaignId', this.campaignId);
      formData.append('elementType', CanvasElementType.Token.toString());
      formData.append('x', targetX.toString());
      formData.append('y', targetY.toString());
      formData.append('z', targetZ.toString());
      formData.append('scale', '1');
      formData.append('content', tokenName);
      formData.append('color', this.customTokenColor);
      formData.append(
        'image',
        this.customTokenFile,
        this.customTokenFile.name || 'token-icon.png',
      );

      this.canvasElementService.CreateImageElement(formData as any).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const newEl: ExtendedCanvasElement = {
              ...res.data,
              content: res.data.content || tokenName,
              color: res.data.color || this.customTokenColor,
              imageUrl:
                res.data.imageUrl ||
                (res.data as any).image ||
                this.customTokenImagePreview ||
                undefined,
            };
            this.selectAndSyncElement(newEl);
            this.customTokenName = '';
            this.clearCustomTokenImage();
            this.isTokenModalOpen = false;
            this.refreshStorageUsage();
          } else {
            this.showError(res.message || 'Erro ao criar token personalizado.');
          }
          this.isCreatingElement = false;
        },
        error: (err) => {
          console.error('[Canvas] Erro ao criar token com imagem:', err);
          this.handleApiError(err);
          this.isCreatingElement = false;
        },
      });
    } else {
      const req: CreateCanvaElementRequest = {
        campaignId: this.campaignId,
        elementType: CanvasElementType.Token,
        content: tokenName,
        x: targetX,
        y: targetY,
        z: targetZ,
        scale: 1,
        color: this.customTokenColor,
        image: undefined,
      };

      this.canvasElementService.CreateElement(req).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const newEl: ExtendedCanvasElement = {
              ...res.data,
              content: res.data.content || tokenName,
              color: res.data.color || this.customTokenColor,
            };
            this.selectAndSyncElement(newEl);
            this.customTokenName = '';
            this.clearCustomTokenImage();
            this.isTokenModalOpen = false;
            this.refreshStorageUsage();
          } else {
            this.showError(res.message || 'Erro ao criar token personalizado.');
          }
          this.isCreatingElement = false;
        },
        error: (err) => {
          console.error('[Canvas] Erro ao criar token sem imagem:', err);
          this.handleApiError(err);
          this.isCreatingElement = false;
        },
      });
    }
  }

  addText(): void {
    if (!this.isCampaignActive) return;
    this.customTextContent = '';
    this.isTextModalOpen = true;
  }

  confirmAddText(): void {
    if (!this.isCampaignActive) return;

    if (!this.customTextContent.trim()) {
      this.showError('Por favor, digite o conteúdo da anotação.');
      return;
    }

    if (this.isCreatingElement) return;
    this.isCreatingElement = true;

    const center = this.getViewportCenterWorld();

    const req: CreateCanvaElementRequest = {
      campaignId: this.campaignId,
      elementType: CanvasElementType.Text,
      content: this.customTextContent.trim(),
      x: center.x - 40,
      y: center.y - 15,
      z: ++this.maxZ,
      scale: 1,
      color: this.selectedColor,
      image: undefined,
    };

    this.canvasElementService.CreateElement(req).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectAndSyncElement(res.data);
          this.isTextModalOpen = false;
          this.customTextContent = '';
          this.refreshStorageUsage();
        } else {
          this.showError(res.message || 'Erro ao adicionar anotação.');
        }
        this.isCreatingElement = false;
      },
      error: (err) => {
        console.error('[Canvas] Erro ao criar texto:', err);
        this.handleApiError(err);
        this.isCreatingElement = false;
      },
    });
  }

  loadElements(): void {
    if (!this.campaignId) return;

    const bounds = this.getCanvasBounds();
    const buffer = 5000;
    const minX = this.getWorldX(bounds.left) - buffer;
    const maxX = this.getWorldX(bounds.left + bounds.width) + buffer;
    const minY = this.getWorldY(bounds.top) - buffer;
    const maxY = this.getWorldY(bounds.top + bounds.height) + buffer;

    this.canvasElementService.GetAllElements(this.campaignId, minX, minY, maxX, maxY).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.canvasSizeMb = res.data.canvasSizeMb ?? 0;
          this.campaignStorageCapacity = res.data.campaignStorageCapaity ?? 0;

          this.elements = res.data.elements.map((el: any) => ({
            ...el,
            scale: Number(el.scale) || 1,
            imageUrl: el.imageUrl || el.image || undefined,
            isRound: el.content === 'round' || el.isRound === true,
            isLocked: Boolean(el.isLocked),
          }));

          if (this.elements.length > 0) {
            this.maxZ = Math.max(...this.elements.map((e) => e.z));
          }
        } else {
          this.showError(res.message || 'Erro ao carregar os elementos do tabuleiro.');
        }
      },
      error: (err) => {
        console.error('[Canvas] Erro HTTP em GetAllElements:', err);
        this.handleApiError(err);
      },
    });
  }

  refreshStorageUsage(): void {
    if (!this.campaignId) return;

    const bounds = this.getCanvasBounds();
    const buffer = 5000;
    const minX = this.getWorldX(bounds.left) - buffer;
    const maxX = this.getWorldX(bounds.left + bounds.width) + buffer;
    const minY = this.getWorldY(bounds.top) - buffer;
    const maxY = this.getWorldY(bounds.top + bounds.height) + buffer;

    this.canvasElementService.GetAllElements(this.campaignId, minX, minY, maxX, maxY).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.canvasSizeMb = res.data.canvasSizeMb ?? 0;
          this.campaignStorageCapacity = res.data.campaignStorageCapaity ?? 0;
        }
      },
      error: (err) => {
        console.error('[Canvas] Erro ao atualizar indicador de armazenamento:', err);
      },
    });
  }

  updateElementAPI(el: ExtendedCanvasElement): void {
    if (!this.isCampaignActive || !el || !el.id || el.id.startsWith('temp-')) return;

    const imageToUpdate =
      el.imageUrl && el.imageUrl.startsWith('data:image') ? undefined : el.imageUrl;

    const req: UpdateCanvaElementRequest = {
      id: el.id,
      campaignId: this.campaignId,
      scale: el.scale,
      color: el.color || '#9E74D0',
      content: el.content || (el.isRound ? 'round' : 'square'),
      image: imageToUpdate,
      points: el.elementType === CanvasElementType.Drawing ? el.points : undefined,
    };

    this.canvasElementService.UpdateElement(req).subscribe({
      next: () => {
        this.refreshStorageUsage();
      },
      error: (err) => {
        console.error('[Canvas] Erro ao atualizar elemento no Canva:', err);
        this.handleApiError(err);
      },
    });
  }

  updateElementScale(event: Event): void {
    if (
      !this.isCampaignActive ||
      this.selectedElements.length !== 1 ||
      this.selectedElements[0].isLocked
    )
      return;
    const input = event.target as HTMLInputElement;
    const newScale = parseFloat(input.value);

    if (isNaN(newScale)) return;

    this.saveState([this.selectedElements[0]]);
    this.selectedElements[0].scale = newScale;

    const req: ScaleElementRequest = {
      campaignId: this.campaignId,
      items: [
        {
          id: this.selectedElements[0].id,
          scale: newScale,
        },
      ],
    };

    this.canvasElementService.ScaleElement(req).subscribe({
      error: (err) => {
        console.error('[Canvas] Erro ao escalonar elemento no Canva:', err);
        this.handleApiError(err);
      },
    });
  }

  // ── HISTÓRICO (DESFAZER / REFAZER) ──
  private cloneElement(el: ExtendedCanvasElement): ExtendedCanvasElement {
    return JSON.parse(JSON.stringify(el));
  }

  private captureSnapshot(els: ExtendedCanvasElement[]): HistoryEntry {
    const entry: HistoryEntry = {};
    els.forEach((el) => {
      if (el?.id && !el.id.startsWith('temp-') && !(el.id in entry)) {
        entry[el.id] = this.cloneElement(el);
      }
    });
    return entry;
  }

  private pushHistory(entry: HistoryEntry | null): void {
    if (!this.isCampaignActive || !entry || Object.keys(entry).length === 0) return;
    this.history.push(entry);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.redoHistory = [];
  }

  /** Salva o estado atual dos elementos que a próxima ação vai alterar. */
  saveState(els: ExtendedCanvasElement[] = this.selectedElements): void {
    this.pushHistory(this.captureSnapshot(els));
  }

  private recordCreated(ids: string[]): void {
    const entry: HistoryEntry = {};
    ids.forEach((id) => {
      if (id && !id.startsWith('temp-')) entry[id] = null;
    });
    this.pushHistory(entry);
  }

  undo(): void {
    if (!this.isCampaignActive || this.history.length === 0) return;
    const entry = this.history.pop()!;
    this.redoHistory.push(this.applyHistoryEntry(entry));
  }

  redo(): void {
    if (!this.isCampaignActive || this.redoHistory.length === 0) return;
    const entry = this.redoHistory.pop()!;
    this.history.push(this.applyHistoryEntry(entry));
  }

  /** Aplica a entrada (local + servidor) e devolve a entrada inversa. */
  private applyHistoryEntry(entry: HistoryEntry): HistoryEntry {
    const inverse: HistoryEntry = {};
    const toDeactivate: string[] = [];
    const toActivate: string[] = [];
    const toLock: string[] = [];
    const toUnlock: string[] = [];
    const moved: { id: string; x: number; y: number }[] = [];
    const scaled: { id: string; scale: number }[] = [];
    const colorGroups = new Map<string, string[]>();
    let zChanged = false;

    Object.entries(entry).forEach(([id, target]) => {
      const idx = this.elements.findIndex((e) => e.id === id);
      const current = idx > -1 ? this.elements[idx] : null;
      inverse[id] = current ? this.cloneElement(current) : null;

      if (!target) {
        if (current) {
          this.elements.splice(idx, 1);
          toDeactivate.push(id);
        }
        return;
      }

      const restored = this.cloneElement(target);

      if (!current) {
        this.elements.push(restored);
        toActivate.push(id);
        return;
      }

      this.elements[idx] = restored;

      if (Boolean(current.isLocked) !== Boolean(restored.isLocked)) {
        if (restored.isLocked) toLock.push(id);
        else toUnlock.push(id);
      }

      if (
        restored.elementType !== CanvasElementType.Drawing &&
        (current.x !== restored.x || current.y !== restored.y)
      ) {
        moved.push({ id, x: restored.x, y: restored.y });
      }
      if ((current.scale || 1) !== (restored.scale || 1)) {
        scaled.push({ id, scale: restored.scale || 1 });
      }
      if (current.z !== restored.z) zChanged = true;

      if (restored.color && current.color?.toUpperCase() !== restored.color.toUpperCase()) {
        const targetColor = restored.color.toUpperCase();
        const group = colorGroups.get(targetColor) ?? [];
        group.push(id);
        colorGroups.set(targetColor, group);
      }

      if (current.content !== restored.content && restored.content !== undefined) {
        this.canvasElementService
          .UpdateElementContent({
            campaignId: this.campaignId,
            elementId: id,
            content: restored.content,
          })
          .subscribe({
            next: () => this.refreshStorageUsage(),
            error: (err) => {
              console.error('[Canvas] Erro ao sincronizar conteúdo (histórico):', err);
              this.handleApiError(err);
            },
          });
      }

      if (this.hasOtherVisualDiff(current, restored)) {
        this.updateElementAPI(restored);
      }
    });

    if (toDeactivate.length > 0) {
      this.canvasElementService
        .DeactiveElement({ campaignId: this.campaignId, ids: toDeactivate })
        .subscribe({
          next: () => this.refreshStorageUsage(),
          error: (err) => {
            console.error('[Canvas] Erro ao desativar elementos (histórico):', err);
            this.handleApiError(err);
          },
        });
    }

    if (toActivate.length > 0) {
      this.canvasElementService
        .ActiveElement({ campaignId: this.campaignId, ids: toActivate })
        .subscribe({
          next: () => this.refreshStorageUsage(),
          error: (err) => {
            console.error('[Canvas] Erro ao reativar elementos (histórico):', err);
            this.handleApiError(err);
          },
        });
    }

    if (toLock.length > 0) {
      this.canvasElementService
        .LockElement({ campaignId: this.campaignId, ids: toLock })
        .subscribe({
          error: (err) => {
            console.error('[Canvas] Erro ao travar elementos (histórico):', err);
            this.handleApiError(err);
          },
        });
    }

    if (toUnlock.length > 0) {
      this.canvasElementService
        .UnLockElement({ campaignId: this.campaignId, ids: toUnlock })
        .subscribe({
          error: (err) => {
            console.error('[Canvas] Erro ao destravar elementos (histórico):', err);
            this.handleApiError(err);
          },
        });
    }

    if (moved.length > 0) {
      this.canvasElementService
        .MoveElement({ campaignId: this.campaignId, items: moved })
        .subscribe({
          error: (err) => {
            console.error('[Canvas] Erro ao mover elementos (histórico):', err);
            this.handleApiError(err);
          },
        });
    }

    if (scaled.length > 0) {
      this.canvasElementService
        .ScaleElement({ campaignId: this.campaignId, items: scaled })
        .subscribe({
          error: (err) => {
            console.error('[Canvas] Erro ao escalonar elementos (histórico):', err);
            this.handleApiError(err);
          },
        });
    }

    colorGroups.forEach((ids, color) => {
      this.canvasElementService
        .ChangeColor({
          campaignId: this.campaignId,
          ids,
          color,
        })
        .subscribe({
          next: () => this.refreshStorageUsage(),
          error: (err) => {
            console.error('[Canvas] Erro ao sincronizar cor (histórico):', err);
            this.handleApiError(err);
          },
        });
    });

    if (zChanged) {
      this.sortElements();
      this.syncZOrderAPI();
    }

    this.selectedElements = [];
    return inverse;
  }

  private hasOtherVisualDiff(a: ExtendedCanvasElement, b: ExtendedCanvasElement): boolean {
    return (
      !!a.hideName !== !!b.hideName ||
      !!a.isRound !== !!b.isRound ||
      a.imageUrl !== b.imageUrl ||
      JSON.stringify(a.points ?? null) !== JSON.stringify(b.points ?? null)
    );
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && (this.isColorPickerOpen || this.isAddMenuOpen)) {
      this.isColorPickerOpen = false;
      this.isAddMenuOpen = false;
      event.preventDefault();
      return;
    }

    if (!this.isCampaignActive) return;
    if (this.shouldIgnoreShortcut(event.target)) return;

    const ctrlOrCmd = event.ctrlKey || event.metaKey;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedElements.length > 0) {
        this.deleteSelected();
        event.preventDefault();
      }
    } else if (ctrlOrCmd && event.key.toLowerCase() === 'z') {
      if (event.shiftKey) this.redo();
      else this.undo();
      event.preventDefault();
    } else if (ctrlOrCmd && event.key.toLowerCase() === 'y') {
      this.redo();
      event.preventDefault();
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: Event): void {
    event.preventDefault();
  }

  @HostListener('window:copy', ['$event'])
  onCopy(event: ClipboardEvent): void {
    if (!this.isCampaignActive) return;
    if (this.shouldIgnoreShortcut(event.target)) return;

    if (this.selectedElements.length > 0) {
      this.clipboardStorage = JSON.parse(JSON.stringify(this.selectedElements));

      const data = JSON.stringify({ isRpgDexElements: true, elements: this.selectedElements });
      event.clipboardData?.setData('text/plain', data);
      event.preventDefault();
    }
  }

  @HostListener('window:cut', ['$event'])
  onCut(event: ClipboardEvent): void {
    if (!this.isCampaignActive) return;
    if (this.shouldIgnoreShortcut(event.target)) return;

    if (this.selectedElements.length > 0) {
      this.clipboardStorage = JSON.parse(JSON.stringify(this.selectedElements));

      const data = JSON.stringify({ isRpgDexElements: true, elements: this.selectedElements });
      event.clipboardData?.setData('text/plain', data);

      this.deleteSelected();
      event.preventDefault();
    }
  }

  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (!this.isCampaignActive) return;
    if (this.shouldIgnoreShortcut(event.target)) return;

    const items = event.clipboardData?.items;
    const textData = event.clipboardData?.getData('text/plain');
    const center = this.getViewportCenterWorld();

    let elementsToPaste: ExtendedCanvasElement[] = [];

    if (textData && textData.includes('isRpgDexElements')) {
      try {
        const parsed = JSON.parse(textData);
        if (parsed.isRpgDexElements && Array.isArray(parsed.elements)) {
          elementsToPaste = parsed.elements;
        }
      } catch (e) {}
    }

    if (elementsToPaste.length === 0 && this.clipboardStorage.length > 0) {
      elementsToPaste = this.clipboardStorage;
    }

    if (elementsToPaste.length > 0) {
      this.selectedElements = [];

      const pasteEntry: HistoryEntry = {};
      let pendingPastes = elementsToPaste.length;
      const onPasted = (createdId?: string) => {
        if (createdId) pasteEntry[createdId] = null;
        pendingPastes--;
        if (pendingPastes <= 0) this.pushHistory(pasteEntry);
      };

      const targetPos =
        this.mouseWorldPos.x !== 0 || this.mouseWorldPos.y !== 0 ? this.mouseWorldPos : center;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      elementsToPaste.forEach((el) => {
        if (el.elementType === CanvasElementType.Drawing && el.points && el.points.length > 0) {
          el.points.forEach((p) => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
        } else {
          if (el.x < minX) minX = el.x;
          if (el.x > maxX) maxX = el.x;
          if (el.y < minY) minY = el.y;
          if (el.y > maxY) maxY = el.y;
        }
      });

      const groupCenterX = (minX + maxX) / 2;
      const groupCenterY = (minY + maxY) / 2;

      elementsToPaste.forEach((el: ExtendedCanvasElement) => {
        const offsetX = el.x - groupCenterX;
        const offsetY = el.y - groupCenterY;
        const newX = targetPos.x + offsetX;
        const newY = targetPos.y + offsetY;

        let translatedPoints = el.points;
        if (el.elementType === CanvasElementType.Drawing && el.points && el.points.length > 0) {
          const deltaX = targetPos.x - groupCenterX;
          const deltaY = targetPos.y - groupCenterY;
          translatedPoints = el.points.map((p) => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          }));
        }

        // 1. Token vinculado a personagem
        if (el.elementType === CanvasElementType.Token && el.characterId) {
          const req: CreateCanvaTokenElementRequest = {
            campaignId: this.campaignId,
            characterId: el.characterId,
            content: el.content,
            x: newX,
            y: newY,
            z: ++this.maxZ,
            scale: el.scale,
            color: el.color,
          };

          this.canvasElementService.CreateTokenElement(req).subscribe({
            next: (res) => {
              if (res.success && res.data) {
                const responseData = res.data;
                const createdEl: ExtendedCanvasElement = {
                  ...responseData,
                  imageUrl: responseData.imageUrl || (responseData as any).image || el.imageUrl,
                  isRound: el.isRound,
                  isLocked: Boolean(responseData.isLocked),
                };

                const index = this.elements.findIndex((e) => e.id === responseData.id);
                if (index > -1) {
                  this.elements[index] = createdEl;
                } else {
                  this.elements.push(createdEl);
                }

                this.selectedElements = [...this.selectedElements, createdEl];
                this.refreshStorageUsage();
              }
              onPasted(res.success ? res.data?.id : undefined);
            },
            error: (err) => {
              console.error('[Canvas] Erro ao colar token:', err);
              this.handleApiError(err);
              onPasted();
            },
          });

        // 2. Imagem ou Token personalizado com imagem
        } else if (
          (el.elementType === CanvasElementType.Image ||
            el.elementType === CanvasElementType.Token) &&
          el.imageUrl
        ) {
          fetch(el.imageUrl)
            .then((response) => response.blob())
            .then((blob) => {
              const isToken = el.elementType === CanvasElementType.Token;
              const fileName = isToken ? 'pasted-token.png' : 'pasted-image.png';
              const file = new File([blob], fileName, { type: blob.type || 'image/png' });

              const formData = new FormData();
              formData.append('campaignId', this.campaignId);
              formData.append('elementType', el.elementType.toString());
              formData.append('x', newX.toString());
              formData.append('y', newY.toString());
              formData.append('z', (++this.maxZ).toString());
              formData.append('scale', (el.scale || 1).toString());
              formData.append(
                'content',
                isToken ? el.content || 'Token' : el.isRound ? 'round' : el.content || 'square',
              );
              if (isToken) {
                formData.append('color', el.color || '#9E74D0');
              }
              formData.append('image', file, file.name);

              this.canvasElementService.CreateImageElement(formData as any).subscribe({
                next: (res) => {
                  if (res.success && res.data) {
                    const createdEl: ExtendedCanvasElement = {
                      ...res.data,
                      imageUrl:
                        res.data.imageUrl || (res.data as any).image || el.imageUrl,
                      isRound: !isToken && (el.isRound || res.data.content === 'round'),
                      isLocked: Boolean(res.data.isLocked),
                    };
                    const index = this.elements.findIndex((e) => e.id === res.data!.id);
                    if (index > -1) this.elements[index] = createdEl;
                    else this.elements.push(createdEl);

                    this.selectedElements = [...this.selectedElements, createdEl];
                    this.refreshStorageUsage();
                  }
                  onPasted(res.success ? res.data?.id : undefined);
                },
                error: (err) => {
                  console.error('[Canvas] Erro ao colar elemento com imagem:', err);
                  this.handleApiError(err);
                  onPasted();
                },
              });
            })
            .catch((err) => {
              console.error('[Canvas] Erro ao obter blob da imagem copiada:', err);
              this.showError('Não foi possível duplicar a imagem selecionada.');
              onPasted();
            });

        // 3. Demais elementos (Texto, Desenho, Token personalizado sem imagem)
        } else {
          const req: CreateCanvaElementRequest = {
            campaignId: this.campaignId,
            elementType: el.elementType,
            content: el.content,
            x: newX,
            y: newY,
            z: ++this.maxZ,
            scale: el.scale,
            color: el.color,
            strokeWidth: el.strokeWidth,
            points: translatedPoints,
            image: undefined,
          };

          this.canvasElementService.CreateElement(req).subscribe({
            next: (res) => {
              if (res.success && res.data) {
                const responseData = res.data;
                const createdEl: ExtendedCanvasElement = {
                  ...responseData,
                  points: translatedPoints,
                  imageUrl: responseData.imageUrl || (responseData as any).image || el.imageUrl,
                  isRound: el.isRound,
                  isLocked: Boolean(responseData.isLocked),
                };

                const index = this.elements.findIndex((e) => e.id === responseData.id);
                if (index > -1) {
                  this.elements[index] = createdEl;
                } else {
                  this.elements.push(createdEl);
                }

                this.selectedElements = [...this.selectedElements, createdEl];
                this.refreshStorageUsage();
              }
              onPasted(res.success ? res.data?.id : undefined);
            },
            error: (err) => {
              console.error('[Canvas] Erro ao colar elemento:', err);
              this.handleApiError(err);
              onPasted();
            },
          });
        }
      });

      event.preventDefault();
      return;
    }

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            this.selectedFile = file;

            const targetPos =
              this.mouseWorldPos.x !== 0 || this.mouseWorldPos.y !== 0 ? this.mouseWorldPos : center;

            const formData = new FormData();
            formData.append('campaignId', this.campaignId);
            formData.append('elementType', CanvasElementType.Image.toString());
            formData.append('x', (targetPos.x - 50).toString());
            formData.append('y', (targetPos.y - 50).toString());
            formData.append('z', (++this.maxZ).toString());
            formData.append('scale', '1');
            formData.append('content', 'square');
            formData.append('image', this.selectedFile, this.selectedFile.name);

            this.canvasElementService.CreateImageElement(formData as any).subscribe({
              next: (res) => {
                if (res.success && res.data) {
                  this.selectAndSyncElement(res.data);
                  this.refreshStorageUsage();
                } else {
                  this.showError(res.message || 'Erro ao colar imagem no tabuleiro.');
                }
              },
              error: (err) => {
                console.error('[Canvas] Erro ao colar imagem:', err);
                this.handleApiError(err);
              },
            });
            event.preventDefault();
            return;
          }
        }
      }
    }

    if (textData && textData.trim() !== '') {
      const targetPos =
        this.mouseWorldPos.x !== 0 || this.mouseWorldPos.y !== 0 ? this.mouseWorldPos : center;

      const req: CreateCanvaElementRequest = {
        campaignId: this.campaignId,
        elementType: CanvasElementType.Text,
        content: textData,
        x: targetPos.x - 40,
        y: targetPos.y - 15,
        z: ++this.maxZ,
        scale: 1,
        color: this.selectedColor,
        image: undefined,
      };

      this.canvasElementService.CreateElement(req).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.selectAndSyncElement(res.data);
            this.refreshStorageUsage();
          } else {
            this.showError(res.message || 'Erro ao colar texto no tabuleiro.');
          }
        },
        error: (err) => {
          console.error('[Canvas] Erro ao colar texto:', err);
          this.handleApiError(err);
        },
      });
      event.preventDefault();
    }
  }

  setTool(tool: ToolMode): void {
    if (!this.isCampaignActive && tool !== 'cursor') return;
    this.activeTool = tool;
    this.selectedElements = [];
    this.isAddMenuOpen = false;
  }

  triggerImageUpload(): void {
    if (!this.isCampaignActive) return;
    this.fileInput.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    if (!this.isCampaignActive) return;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile = file;
      const center = this.getViewportCenterWorld();

      const formData = new FormData();
      formData.append('campaignId', this.campaignId);
      formData.append('elementType', CanvasElementType.Image.toString());
      formData.append('x', (center.x - 50).toString());
      formData.append('y', (center.y - 50).toString());
      formData.append('z', (++this.maxZ).toString());
      formData.append('scale', '1');
      formData.append('content', 'square');
      formData.append('image', this.selectedFile, this.selectedFile.name);

      this.canvasElementService.CreateImageElement(formData as any).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.selectAndSyncElement(res.data);
            this.refreshStorageUsage();
          } else {
            this.showError(res.message || 'Erro ao enviar imagem para o tabuleiro.');
          }
        },
        error: (err) => {
          console.error('[Canvas] Erro ao enviar imagem:', err);
          this.handleApiError(err);
        },
      });
    }
    input.value = '';
  }

  onColorChange(colorValue: string): void {
    if (!this.isCampaignActive) return;
    const normalizedColor = colorValue.toUpperCase();
    if (this.selectedColor.toUpperCase() === normalizedColor) return;
    this.selectedColor = normalizedColor;

    if (this.selectedElements.length > 0) {
      const elementsToUpdate = this.selectedElements.filter(
        (el) =>
          el.elementType !== CanvasElementType.Image &&
          !el.isLocked &&
          !el.id.startsWith('temp-') &&
          el.color?.toUpperCase() !== this.selectedColor,
      );

      if (elementsToUpdate.length === 0) return;

      this.saveState(elementsToUpdate);

      const idsToUpdate = elementsToUpdate.map((el) => el.id);
      elementsToUpdate.forEach((el) => {
        el.color = this.selectedColor;
      });

      this.canvasElementService
        .ChangeColor({
          campaignId: this.campaignId,
          ids: idsToUpdate,
          color: this.selectedColor,
        })
        .subscribe({
          next: () => {
            this.refreshStorageUsage();
          },
          error: (err) => {
            console.error('[Canvas] Erro ao alterar cor dos elementos:', err);
            this.handleApiError(err);
          },
        });
    }
  }

  deleteSelected(): void {
    if (!this.isCampaignActive) return;
    const deletable = this.selectedElements.filter((e) => !e.isLocked);
    if (deletable.length === 0) return;
    this.saveState(deletable);

    const idsToDelete = deletable.map((el) => el.id);

    const deleteRequest = {
      campaignId: this.campaignId,
      ids: idsToDelete,
    };

    this.canvasElementService.DeactiveElement(deleteRequest).subscribe({
      next: () => {
        this.refreshStorageUsage();
      },
      error: (err) => {
        console.error('[Canvas] Erro ao desativar elementos:', err);
        this.handleApiError(err);
      },
    });

    this.elements = this.elements.filter((e) => !idsToDelete.includes(e.id));
    this.selectedElements = [];
  }

  eraseDrawingsAt(wx: number, wy: number): void {
    if (!this.isCampaignActive || isNaN(wx) || isNaN(wy)) return;

    const eraseRadius = 16;
    const trailPoint: EraserTrailPoint = { x: wx, y: wy, id: Date.now() + Math.random() };

    this.eraserTrail.push(trailPoint);
    setTimeout(() => {
      this.eraserTrail = this.eraserTrail.filter((p) => p.id !== trailPoint.id);
    }, 350);

    const drawingsToErase = this.elements.filter(
      (el) =>
        el.elementType === CanvasElementType.Drawing &&
        !el.isLocked &&
        el.points &&
        el.points.some((p) => Math.hypot(p.x - wx, p.y - wy) <= eraseRadius),
    );

    if (drawingsToErase.length > 0) {
      if (this.eraserBatch) Object.assign(this.eraserBatch, this.captureSnapshot(drawingsToErase));
      else this.saveState(drawingsToErase);
      const idsToErase = drawingsToErase.map((el) => el.id);

      const deleteRequest = {
        campaignId: this.campaignId,
        ids: idsToErase,
      };

      this.canvasElementService.DeactiveElement(deleteRequest).subscribe({
        next: () => {
          this.refreshStorageUsage();
        },
        error: (err) => {
          console.error('[Canvas] Erro ao apagar desenhos:', err);
          this.handleApiError(err);
        },
      });

      this.elements = this.elements.filter((e) => !idsToErase.includes(e.id));
    }
  }

  bringForward(): void {
    if (!this.isCampaignActive || this.selectedElements.length === 0) return;
    this.saveState();
    this.selectedElements.forEach((el) => {
      if (!el.isLocked) {
        this.maxZ++;
        el.z = this.maxZ;
      }
    });
    this.sortElements();
    this.syncZOrderAPI();
  }

  sendBackward(): void {
    if (!this.isCampaignActive || this.selectedElements.length === 0) return;
    this.saveState();
    const minZ = Math.min(...this.elements.map((e) => e.z)) - 1;
    this.selectedElements.forEach((el) => {
      if (!el.isLocked) {
        el.z = minZ;
      }
    });
    this.sortElements();
    this.syncZOrderAPI();
  }

  syncZOrderAPI(): void {
    if (!this.isCampaignActive) return;
    const req: ReOrderCanvaElementsRequest = {
      campaignId: this.campaignId,
      items: this.elements.map((el) => ({ id: el.id, z: el.z })),
    };
    this.canvasElementService.ReOrderElement(req).subscribe({
      error: (err) => {
        console.error('[Canvas] Erro ao reordenar Z:', err);
        this.handleApiError(err);
      },
    });
  }

  sortElements(): void {
    this.elements.sort((a, b) => a.z - b.z);
  }

  startCropping(): void {
    if (!this.isCampaignActive) return;
    if (
      this.selectedElements.length === 1 &&
      (this.selectedElements[0].elementType === CanvasElementType.Image ||
        this.selectedElements[0].elementType === CanvasElementType.Token) &&
      !this.selectedElements[0].isLocked &&
      this.selectedElements[0].imageUrl
    ) {
      const currentImage = this.selectedElements[0].imageUrl ?? '';

      this.isRoundCrop = !!this.selectedElements[0].isRound;
      this.isCroppingCustomToken = false;
      this.isCropping = true;
      this.cropImageSource = '';
      this.tempCroppedBase64 = '';
      this.croppedBlob = null;

      setTimeout(() => {
        this.cropImageSource = currentImage;
        this.tempCroppedBase64 = currentImage;
      }, 10);
    }
  }

  startCroppingCustomTokenImage(): void {
    if (!this.isCampaignActive) return;
    if (this.customTokenImagePreview) {
      this.isCroppingCustomToken = true;
      this.isCropping = true;
      this.cropImageSource = '';
      this.tempCroppedBase64 = '';
      this.croppedBlob = null;

      setTimeout(() => {
        this.cropImageSource = this.customTokenImagePreview!;
        this.tempCroppedBase64 = this.customTokenImagePreview!;
      }, 10);
    }
  }

  imageCropped(event: ImageCroppedEvent): void {
    if (event.blob) {
      this.croppedBlob = event.blob;
    }
    if (event.base64) {
      this.tempCroppedBase64 = event.base64;
    } else if (event.objectUrl) {
      this.tempCroppedBase64 = event.objectUrl;
    }
  }

  saveCrop(): void {
    if (!this.isCampaignActive) return;

    if (this.isCroppingCustomToken) {
      if (this.tempCroppedBase64) {
        this.customTokenImagePreview = this.tempCroppedBase64;
        if (this.croppedBlob) {
          this.customTokenFile = new File([this.croppedBlob], 'token-cropped.png', {
            type: 'image/png',
          });
        }
      }
    } else if (this.selectedElements.length === 1 && (this.croppedBlob || this.tempCroppedBase64)) {
      const targetElement = this.selectedElements[0];
      const oldId = targetElement.id;
      const isRound = this.isRoundCrop;
      const currentScale = targetElement.scale || 1;
      const isToken = targetElement.elementType === CanvasElementType.Token;
      const beforeSnapshot = this.cloneElement(targetElement);
      const keptContent = isToken
        ? targetElement.content || 'Token'
        : isRound
          ? 'round'
          : 'square';

      if (this.croppedBlob) {
        const croppedFile = new File([this.croppedBlob], 'cropped-element.png', {
          type: 'image/png',
        });
        const formData = new FormData();
        formData.append('campaignId', this.campaignId);
        formData.append('CampaignId', this.campaignId);
        formData.append('elementType', targetElement.elementType.toString());
        formData.append('ElementType', targetElement.elementType.toString());
        formData.append('x', targetElement.x.toString());
        formData.append('X', targetElement.x.toString());
        formData.append('y', targetElement.y.toString());
        formData.append('Y', targetElement.y.toString());
        formData.append('z', targetElement.z.toString());
        formData.append('Z', targetElement.z.toString());
        formData.append('scale', currentScale.toString());
        formData.append('Scale', currentScale.toString());
        formData.append('content', keptContent);
        formData.append('Content', keptContent);
        if (isToken) {
          formData.append('color', targetElement.color || '#9E74D0');
        }
        formData.append('image', croppedFile, croppedFile.name);

        this.canvasElementService.CreateImageElement(formData as any).subscribe({
          next: (res) => {
            if (res.success && res.data) {
              if (oldId && !oldId.startsWith('temp-')) {
                this.canvasElementService
                  .DeactiveElement({
                    campaignId: this.campaignId,
                    ids: [oldId],
                  })
                  .subscribe({
                    next: () => this.refreshStorageUsage(),
                    error: (err) => this.handleApiError(err),
                  });
              }

              const newUrl = res.data.imageUrl || (res.data as any).image;

              const newEl: ExtendedCanvasElement = {
                ...res.data,
                x: targetElement.x,
                y: targetElement.y,
                z: targetElement.z,
                scale: currentScale,
                imageUrl: newUrl,
                isRound: !isToken && isRound,
                content: keptContent,
                color: res.data.color || targetElement.color,
                isLocked: targetElement.isLocked,
                hideName: targetElement.hideName,
              };

              this.canvasElementService
                .MoveElement({
                  campaignId: this.campaignId,
                  items: [{ id: newEl.id, x: newEl.x, y: newEl.y }],
                })
                .subscribe({
                  error: (err) => this.handleApiError(err),
                });

              this.updateElementAPI(newEl);

              this.elements = this.elements.filter((e) => e.id !== newEl.id);
              const index = this.elements.findIndex((e) => e.id === oldId);
              if (index > -1) {
                this.elements[index] = newEl;
              } else {
                this.elements.push(newEl);
              }
              this.selectedElements = [newEl];
              this.pushHistory({ [oldId]: beforeSnapshot, [newEl.id]: null });
              this.refreshStorageUsage();
            } else {
              this.showError(res.message || 'Erro ao salvar imagem recortada.');
            }
          },
          error: (err) => {
            console.error('[Canvas] Erro ao persistir imagem cortada:', err);
            this.handleApiError(err);
          },
        });
      } else if (!isToken && !!targetElement.isRound !== isRound) {
        this.saveState([targetElement]);
        targetElement.isRound = isRound;
        targetElement.content = isRound ? 'round' : 'square';
        this.updateElementAPI(targetElement);
      }
    }

    this.isCropping = false;
    this.isCroppingCustomToken = false;
    this.cropImageSource = '';
  }

  cancelCrop(): void {
    this.isCropping = false;
    this.isCroppingCustomToken = false;
    this.cropImageSource = '';
    this.croppedBlob = null;
  }

  setCropShape(isRound: boolean): void {
    this.isRoundCrop = isRound;
    const temp = this.cropImageSource;
    this.cropImageSource = '';
    setTimeout(() => (this.cropImageSource = temp), 10);
  }

  isBase64Url(url: string): boolean {
    return url ? url.startsWith('data:image') : false;
  }

  getWorldX(screenX: number): number {
    const bounds = this.getCanvasBounds();
    return (screenX - bounds.left - this.panX) / this.scale;
  }

  getWorldY(screenY: number): number {
    const bounds = this.getCanvasBounds();
    return (screenY - bounds.top - this.panY) / this.scale;
  }

  centerCamera(): void {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
  }

  doZoom(newScale: number, clientX: number, clientY: number): void {
    newScale = Math.max(0.2, Math.min(newScale, 4));
    if (newScale === this.scale) return;
    const bounds = this.getCanvasBounds();
    const wx = (clientX - bounds.left - this.panX) / this.scale;
    const wy = (clientY - bounds.top - this.panY) / this.scale;
    this.scale = newScale;
    this.panX = clientX - bounds.left - wx * this.scale;
    this.panY = clientY - bounds.top - wy * this.scale;
  }

  zoomIn(): void {
    const bounds = this.getCanvasBounds();
    this.doZoom(this.scale + 0.2, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  }

  zoomOut(): void {
    const bounds = this.getCanvasBounds();
    this.doZoom(this.scale - 0.2, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const intensity = event.ctrlKey ? 0.01 : 0.0015;
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    this.doZoom(this.scale * Math.exp(-delta * intensity), event.clientX, event.clientY);
  };

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  getAbs(val: number): number {
    return Math.abs(val);
  }

  updateSelectionBoxIntersection(): void {
    const bounds = this.getCanvasBounds();

    const boxLeft =
      bounds.left +
      this.panX +
      Math.min(this.selectionBox.startX, this.selectionBox.currentX) * this.scale;
    const boxRight =
      bounds.left +
      this.panX +
      Math.max(this.selectionBox.startX, this.selectionBox.currentX) * this.scale;
    const boxTop =
      bounds.top +
      this.panY +
      Math.min(this.selectionBox.startY, this.selectionBox.currentY) * this.scale;
    const boxBottom =
      bounds.top +
      this.panY +
      Math.max(this.selectionBox.startY, this.selectionBox.currentY) * this.scale;

    const domElements = this.canvasContainer?.nativeElement?.querySelectorAll(
      '[data-element-id]',
    ) as NodeListOf<HTMLElement>;
    const rectMap = new Map<string, DOMRect>();
    domElements?.forEach((node) => {
      const id = node.getAttribute('data-element-id');
      if (id) rectMap.set(id, node.getBoundingClientRect());
    });

    this.selectedElements = this.elements.filter((el) => {
      if (el.elementType === CanvasElementType.Drawing && el.points && el.points.length > 0) {
        const xs = el.points.map((p) => bounds.left + this.panX + p.x * this.scale);
        const ys = el.points.map((p) => bounds.top + this.panY + p.y * this.scale);
        return (
          Math.min(...xs) < boxRight &&
          Math.max(...xs) > boxLeft &&
          Math.min(...ys) < boxBottom &&
          Math.max(...ys) > boxTop
        );
      }

      const rect = rectMap.get(el.id);
      if (rect) {
        return (
          rect.left < boxRight &&
          rect.right > boxLeft &&
          rect.top < boxBottom &&
          rect.bottom > boxTop
        );
      }

      return false;
    });
  }

  // ── PONTEIROS (MOUSE, CANETA E TOQUE) ──
  private registerPointer(event: PointerEvent): boolean {
    if (event.isPrimary) {
      this.activePointers.clear();
      this.gesture = null;
    }
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size === 2) {
      this.beginGesture();
      return true;
    }
    if (this.activePointers.size > 2 || this.gesture) return true;

    this.primaryPointerId = event.pointerId;
    return false;
  }

  private beginGesture(): void {
    this.cancelCurrentInteraction();
    const [a, b] = Array.from(this.activePointers.values());
    this.gesture = {
      startDist: Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1),
      startScale: this.scale,
      lastMidX: (a.x + b.x) / 2,
      lastMidY: (a.y + b.y) / 2,
    };
  }

  private updateGesture(): void {
    if (!this.gesture || this.activePointers.size < 2) return;
    const [a, b] = Array.from(this.activePointers.values());
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dist = Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1);

    this.panX += midX - this.gesture.lastMidX;
    this.panY += midY - this.gesture.lastMidY;
    this.gesture.lastMidX = midX;
    this.gesture.lastMidY = midY;

    this.doZoom(this.gesture.startScale * (dist / this.gesture.startDist), midX, midY);
  }

  private cancelCurrentInteraction(): void {
    if (this.activeDrawing) {
      const tempId = this.activeDrawing.id;
      this.elements = this.elements.filter((e) => e.id !== tempId);
    }

    if (this.dragBefore && this.hasDragged) {
      Object.entries(this.dragBefore).forEach(([id, before]) => {
        const el = this.elements.find((e) => e.id === id);
        if (el && before) {
          el.x = before.x;
          el.y = before.y;
          if (before.points) el.points = before.points.map((p) => ({ ...p }));
        }
      });
    }

    this.pushHistory(this.eraserBatch);
    this.resetInteractionState();
  }

  private resetInteractionState(): void {
    this.isInteracting = false;
    this.isPanning = false;
    this.selectionBox.active = false;
    this.activeDrawing = null;
    this.hasDragged = false;
    this.dragBefore = null;
    this.eraserBatch = null;
    this.pendingSingleSelect = null;
    this.primaryPointerId = null;
  }

  private capturePointer(event: PointerEvent): void {
    const targetEl = event.target as Element;
    if (targetEl?.setPointerCapture) {
      try {
        targetEl.setPointerCapture(event.pointerId);
      } catch (e) {}
    }
  }

  onPointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('.canvas-ui')) return;
    if (this.registerPointer(event)) return;
    this.capturePointer(event);

    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.hasDragged = false;
    this.dragStartScreen = { x: event.clientX, y: event.clientY };

    if (event.button === 1 || event.button === 2 || !this.isCampaignActive) {
      this.isPanning = true;
      return;
    }

    const wx = this.getWorldX(event.clientX);
    const wy = this.getWorldY(event.clientY);

    if (this.activeTool === 'draw') {
      this.isInteracting = true;
      this.selectedElements = [];
      this.maxZ++;

      const newDrawing: ExtendedCanvasElement = {
        id: 'temp-' + Date.now().toString(),
        elementType: CanvasElementType.Drawing,
        x: 0,
        y: 0,
        z: this.maxZ,
        scale: 1,
        color: this.selectedColor,
        strokeWidth: this.brushSize,
        points: [{ x: wx, y: wy }],
        isLocked: false,
      };
      this.elements.push(newDrawing);
      this.activeDrawing = newDrawing;
    } else if (this.activeTool === 'eraser') {
      this.isInteracting = true;
      this.eraserBatch = {};
      this.eraseDrawingsAt(wx, wy);
    } else if (!(event.target as HTMLElement).closest('.board-element')) {
      this.selectedElements = [];

      if (event.pointerType === 'touch') {
        this.isPanning = true;
        return;
      }

      this.isInteracting = true;
      this.selectionBox = { active: true, startX: wx, startY: wy, currentX: wx, currentY: wy };
    }
  }

  onElementDown(event: PointerEvent, element: ExtendedCanvasElement): void {
    if (!this.isCampaignActive) return;
    if (event.button === 1 || event.button === 2) return;
    if (this.activeTool === 'draw') return;

    event.stopPropagation();
    if (this.registerPointer(event)) return;
    this.capturePointer(event);

    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.hasDragged = false;
    this.dragStartScreen = { x: event.clientX, y: event.clientY };
    this.isInteracting = true;

    if (this.activeTool === 'eraser') {
      this.eraserBatch = {};
      this.eraseDrawingsAt(this.getWorldX(event.clientX), this.getWorldY(event.clientY));
      return;
    }

    const isMultiSelect = event.ctrlKey || event.shiftKey || event.metaKey;
    this.pendingSingleSelect = null;

    if (isMultiSelect) {
      this.selectedElements = this.selectedElements.includes(element)
        ? this.selectedElements.filter((e) => e !== element)
        : [...this.selectedElements, element];
    } else if (!this.selectedElements.includes(element)) {
      this.selectedElements = [element];
    } else if (this.selectedElements.length > 1) {
      this.pendingSingleSelect = element;
    }

    if (
      this.selectedElements.length === 1 &&
      element.elementType !== CanvasElementType.Image &&
      element.color
    ) {
      this.selectedColor = element.color.toUpperCase();
    }

    this.dragBefore = this.captureSnapshot(this.selectedElements.filter((e) => !e.isLocked));
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (this.gesture) {
      this.updateGesture();
      return;
    }

    if (this.primaryPointerId !== null && event.pointerId !== this.primaryPointerId) return;

    this.mouseWorldPos = {
      x: this.getWorldX(event.clientX),
      y: this.getWorldY(event.clientY),
    };

    if (this.isPanning) {
      this.panX += event.clientX - this.lastPointer.x;
      this.panY += event.clientY - this.lastPointer.y;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      return;
    }

    if (!this.isCampaignActive || !this.isInteracting) return;
    if (event.clientX === this.lastPointer.x && event.clientY === this.lastPointer.y) return;

    const wx = this.getWorldX(event.clientX);
    const wy = this.getWorldY(event.clientY);

    if (this.activeTool === 'draw' && this.activeDrawing && this.activeDrawing.points) {
      this.hasDragged = true;
      this.activeDrawing.points.push({ x: wx, y: wy });
    } else if (this.activeTool === 'eraser') {
      this.eraseDrawingsAt(wx, wy);
    } else if (this.activeTool === 'cursor') {
      if (this.selectionBox.active) {
        this.selectionBox.currentX = wx;
        this.selectionBox.currentY = wy;
        this.updateSelectionBoxIntersection();
      } else if (this.selectedElements.length > 0) {
        if (!this.hasDragged) {
          const dist = Math.hypot(
            event.clientX - this.dragStartScreen.x,
            event.clientY - this.dragStartScreen.y,
          );
          if (dist < 4) return;
          this.hasDragged = true;
          this.pendingSingleSelect = null;
        }

        const deltaWorldX = (event.clientX - this.lastPointer.x) / this.scale;
        const deltaWorldY = (event.clientY - this.lastPointer.y) / this.scale;

        this.selectedElements.forEach((el) => {
          if (el.isLocked) return;
          el.x += deltaWorldX;
          el.y += deltaWorldY;

          if (el.elementType === CanvasElementType.Drawing && el.points && el.points.length > 0) {
            el.points.forEach((p) => {
              p.x += deltaWorldX;
              p.y += deltaWorldY;
            });
          }
        });
      }
    }
    this.lastPointer = { x: event.clientX, y: event.clientY };
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  onPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);

    if (this.gesture) {
      if (this.activePointers.size < 2) this.gesture = null;
      return;
    }

    if (this.primaryPointerId !== null && event.pointerId !== this.primaryPointerId) return;

    if (event.type === 'pointercancel') {
      this.cancelCurrentInteraction();
      return;
    }

    if (this.isCampaignActive && this.isInteracting) {
      if (this.activeTool === 'draw' && this.activeDrawing) {
        this.persistDrawing(this.activeDrawing);
      } else if (this.activeTool === 'cursor' && !this.selectionBox.active) {
        if (this.hasDragged) {
          this.persistDrag();
        } else if (this.pendingSingleSelect) {
          this.selectedElements = [this.pendingSingleSelect];
        }
      } else if (this.activeTool === 'eraser') {
        this.pushHistory(this.eraserBatch);
      }
    }

    this.resetInteractionState();
  }

  private persistDrawing(drw: ExtendedCanvasElement): void {
    const points = drw.points ?? [];
    if (points.length === 0) {
      this.elements = this.elements.filter((e) => e.id !== drw.id);
      return;
    }
    if (points.length === 1) points.push({ ...points[0] });

    const req: CreateCanvaElementRequest = {
      campaignId: this.campaignId,
      elementType: CanvasElementType.Drawing,
      x: drw.x,
      y: drw.y,
      z: drw.z,
      scale: drw.scale,
      color: drw.color,
      strokeWidth: drw.strokeWidth,
      points: points,
      image: undefined,
    };

    this.canvasElementService.CreateElement(req).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const saved: ExtendedCanvasElement = {
            ...res.data,
            points: res.data.points?.length ? res.data.points : points,
            isLocked: Boolean(res.data.isLocked),
          };

          if (this.elements.some((e) => e.id === saved.id)) {
            this.elements = this.elements.filter((e) => e.id !== drw.id);
          } else {
            const idx = this.elements.findIndex((e) => e.id === drw.id);
            if (idx > -1) this.elements[idx] = saved;
            else this.elements.push(saved);
          }

          this.recordCreated([saved.id]);
          this.refreshStorageUsage();
        } else {
          this.elements = this.elements.filter((e) => e.id !== drw.id);
          this.showError(res.message || 'Erro ao salvar traço no tabuleiro.');
        }
      },
      error: (err) => {
        console.error('[Canvas] Erro ao salvar desenho:', err);
        this.elements = this.elements.filter((e) => e.id !== drw.id);
        this.handleApiError(err);
      },
    });
  }

  private persistDrag(): void {
    const movable = this.selectedElements.filter((e) => !e.isLocked && !e.id.startsWith('temp-'));
    if (movable.length === 0) return;

    this.pushHistory(this.dragBefore);

    const standardElements = movable.filter((e) => e.elementType !== CanvasElementType.Drawing);
    if (standardElements.length > 0) {
      const req: MoveCanvaElementsRequest = {
        campaignId: this.campaignId,
        items: standardElements.map((el) => ({ id: el.id, x: el.x, y: el.y })),
      };
      this.canvasElementService.MoveElement(req).subscribe({
        error: (err) => {
          console.error('[Canvas] Erro ao mover elementos:', err);
          this.handleApiError(err);
        },
      });
    }

    movable
      .filter((e) => e.elementType === CanvasElementType.Drawing)
      .forEach((drw) => this.updateElementAPI(drw));
  }

  getSvgPath(points?: { x: number; y: number }[]): string {
    if (!points || points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) path += ` L ${points[i].x} ${points[i].y}`;
    return path;
  }
}
