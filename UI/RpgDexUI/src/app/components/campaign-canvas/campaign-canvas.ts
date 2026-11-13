import {
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
  isLocked?: boolean;
  hideName?: boolean;
  isRound?: boolean;
}

interface EraserTrailPoint {
  x: number;
  y: number;
  id: number;
}

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
export class CampaignCanvasComponent implements OnInit, OnDestroy {
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

  history: string[] = [];
  redoHistory: string[] = [];
  pointerDownState: string = '';

  selectedColor: string = '#9E74D0';
  isColorPickerOpen: boolean = false;

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
        if (el) {
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

    this.canvasElementService.onCreateElement().subscribe((newEl) => {
      if (newEl && !this.elements.some((e) => e.id === newEl.id)) {
        const extendedEl = newEl as ExtendedCanvasElement;
        const formatted: ExtendedCanvasElement = {
          ...newEl,
          scale: Number(newEl.scale) || 1,
          imageUrl: newEl.imageUrl || (newEl as any).image || undefined,
          isRound: newEl.content === 'round' || extendedEl.isRound === true,
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

  ngOnDestroy() {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.canvasElementService.stopConnection();
  }

  // ── CONTROLES DO NGX-COLOR ──
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.isColorPickerOpen) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.color-picker-wrapper')) {
      this.isColorPickerOpen = false;
    }
  }

  toggleColorPicker(event: Event): void {
    event.stopPropagation();
    if (!this.isCampaignActive) return;
    this.isColorPickerOpen = !this.isColorPickerOpen;
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

  selectAndSyncElement(element: ExtendedCanvasElement): void {
    let target = this.elements.find((e) => e.id === element.id);
    if (!target) {
      target = element;
      this.elements.push(target);
    }
    this.setTool('cursor');
    this.selectedElements = [target];
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
    this.saveState();

    const shouldHide = !this.areAllSelectedTokensHidden();

    this.selectedElements.forEach((el) => {
      if (el.elementType === CanvasElementType.Token) {
        el.hideName = shouldHide;
        this.updateElementAPI(el);
      }
    });
  }

  toggleLockSelected(): void {
    if (!this.isCampaignActive || this.selectedElements.length === 0) return;
    this.saveState();
    this.selectedElements.forEach((el) => {
      el.isLocked = !el.isLocked;
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
    this.saveState();

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
    this.saveState();

    const center = this.getViewportCenterWorld();
    const targetX = center.x - 25;
    const targetY = center.y - 25;
    const targetZ = ++this.maxZ;

    if (this.customTokenFile) {
      const formData = new FormData();
      formData.append(
        'CharacterIcon',
        this.customTokenFile,
        this.customTokenFile.name || 'token-icon.png',
      );
      formData.append('CampaignId', this.campaignId);
      formData.append('X', targetX.toString());
      formData.append('Y', targetY.toString());
      formData.append('Z', targetZ.toString());
      formData.append('Scale', '1');
      formData.append('Content', this.customTokenName.trim());
      formData.append('Color', this.customTokenColor);
      formData.append('ElementType', CanvasElementType.Token.toString());

      this.canvasElementService.QuickCreateTokenElement(formData as any).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const newEl: ExtendedCanvasElement = {
              ...res.data,
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
          console.error('[Canvas] Erro ao criar token personalizado:', err);
          this.handleApiError(err);
          this.isCreatingElement = false;
        },
      });
    } else {
      const req: CreateCanvaElementRequest = {
        campaignId: this.campaignId,
        elementType: CanvasElementType.Token,
        content: this.customTokenName.trim(),
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
            this.selectAndSyncElement(res.data);
            this.customTokenName = '';
            this.clearCustomTokenImage();
            this.isTokenModalOpen = false;
            this.refreshStorageUsage();
          } else {
            this.showError(res.message || 'Erro ao criar token.');
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
    this.saveState();

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

  saveState(): void {
    if (!this.isCampaignActive) return;
    this.history.push(JSON.stringify(this.elements));
    if (this.history.length > 30) this.history.shift();
    this.redoHistory = [];
  }

  undo(): void {
    if (!this.isCampaignActive) return;

    if (this.history.length > 0) {
      this.redoHistory.push(JSON.stringify(this.elements));
      const prevState = this.history.pop()!;
      const previousElements: ExtendedCanvasElement[] = JSON.parse(prevState);

      const removedIds = this.elements
        .filter(
          (el) => !previousElements.some((prev) => prev.id === el.id) && !el.id.startsWith('temp-'),
        )
        .map((el) => el.id);

      if (removedIds.length > 0) {
        this.canvasElementService
          .DeactiveElement({
            campaignId: this.campaignId,
            ids: removedIds,
          })
          .subscribe({
            next: () => this.refreshStorageUsage(),
            error: (err) => {
              console.error('[Canvas] Erro ao sincronizar desativação no undo:', err);
              this.handleApiError(err);
            },
          });
      }

      const restoredIds = previousElements
        .filter(
          (prev) => !this.elements.some((el) => el.id === prev.id) && !prev.id.startsWith('temp-'),
        )
        .map((prev) => prev.id);

      if (restoredIds.length > 0) {
        this.canvasElementService
          .ActiveElement({
            campaignId: this.campaignId,
            ids: restoredIds,
          })
          .subscribe({
            next: () => this.refreshStorageUsage(),
            error: (err) => {
              console.error('[Canvas] Erro ao reativar elementos no undo:', err);
              this.handleApiError(err);
            },
          });
      }

      const movedItems: { id: string; x: number; y: number }[] = [];
      previousElements.forEach((prev) => {
        const current = this.elements.find((e) => e.id === prev.id);
        if (current && (current.x !== prev.x || current.y !== prev.y)) {
          movedItems.push({ id: prev.id, x: prev.x, y: prev.y });
        }
      });

      if (movedItems.length > 0) {
        this.canvasElementService
          .MoveElement({
            campaignId: this.campaignId,
            items: movedItems,
          })
          .subscribe({
            error: (err) => {
              console.error('[Canvas] Erro ao mover elementos no undo:', err);
              this.handleApiError(err);
            },
          });
      }

      this.elements = previousElements;
      this.selectedElements = [];
    }
  }

  redo(): void {
    if (!this.isCampaignActive) return;

    if (this.redoHistory.length > 0) {
      this.history.push(JSON.stringify(this.elements));
      const nextState = this.redoHistory.pop()!;
      const nextElements: ExtendedCanvasElement[] = JSON.parse(nextState);

      const removedIds = this.elements
        .filter(
          (el) => !nextElements.some((next) => next.id === el.id) && !el.id.startsWith('temp-'),
        )
        .map((el) => el.id);

      if (removedIds.length > 0) {
        this.canvasElementService
          .DeactiveElement({
            campaignId: this.campaignId,
            ids: removedIds,
          })
          .subscribe({
            next: () => this.refreshStorageUsage(),
            error: (err) => {
              console.error('[Canvas] Erro ao desativar elementos no redo:', err);
              this.handleApiError(err);
            },
          });
      }

      const restoredIds = nextElements
        .filter(
          (next) => !this.elements.some((el) => el.id === next.id) && !next.id.startsWith('temp-'),
        )
        .map((next) => next.id);

      if (restoredIds.length > 0) {
        this.canvasElementService
          .ActiveElement({
            campaignId: this.campaignId,
            ids: restoredIds,
          })
          .subscribe({
            next: () => this.refreshStorageUsage(),
            error: (err) => {
              console.error('[Canvas] Erro ao reativar elementos no redo:', err);
              this.handleApiError(err);
            },
          });
      }

      const movedItems: { id: string; x: number; y: number }[] = [];
      nextElements.forEach((next) => {
        const current = this.elements.find((e) => e.id === next.id);
        if (current && (current.x !== next.x || current.y !== next.y)) {
          movedItems.push({ id: next.id, x: next.x, y: next.y });
        }
      });

      if (movedItems.length > 0) {
        this.canvasElementService
          .MoveElement({
            campaignId: this.campaignId,
            items: movedItems,
          })
          .subscribe({
            error: (err) => {
              console.error('[Canvas] Erro ao mover elementos no redo:', err);
              this.handleApiError(err);
            },
          });
      }

      this.elements = nextElements;
      this.selectedElements = [];
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isColorPickerOpen) {
      this.isColorPickerOpen = false;
      event.preventDefault();
      return;
    }

    if (!this.isCampaignActive) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;

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
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;

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
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;

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
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;

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
      this.saveState();
      this.selectedElements = [];

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
            },
            error: (err) => {
              console.error('[Canvas] Erro ao colar token:', err);
              this.handleApiError(err);
            },
          });

        // 2. Imagem ou Token personalizado que já possui imageUrl no canvas
        } else if (
          (el.elementType === CanvasElementType.Image ||
            el.elementType === CanvasElementType.Token) &&
          el.imageUrl
        ) {
          fetch(el.imageUrl)
            .then((response) => response.blob())
            .then((blob) => {
              const fileName =
                el.elementType === CanvasElementType.Token
                  ? 'pasted-token.png'
                  : 'pasted-image.png';
              const file = new File([blob], fileName, { type: blob.type || 'image/png' });

              if (el.elementType === CanvasElementType.Token) {
                const formData = new FormData();
                formData.append('CharacterIcon', file, file.name);
                formData.append('CampaignId', this.campaignId);
                formData.append('X', newX.toString());
                formData.append('Y', newY.toString());
                formData.append('Z', (++this.maxZ).toString());
                formData.append('Scale', (el.scale || 1).toString());
                formData.append('Content', el.content || 'Token');
                formData.append('Color', el.color || '#9E74D0');
                formData.append('ElementType', CanvasElementType.Token.toString());

                this.canvasElementService.QuickCreateTokenElement(formData as any).subscribe({
                  next: (res) => {
                    if (res.success && res.data) {
                      const createdEl: ExtendedCanvasElement = {
                        ...res.data,
                        imageUrl:
                          res.data.imageUrl || (res.data as any).image || el.imageUrl,
                      };
                      const index = this.elements.findIndex((e) => e.id === res.data!.id);
                      if (index > -1) this.elements[index] = createdEl;
                      else this.elements.push(createdEl);

                      this.selectedElements = [...this.selectedElements, createdEl];
                      this.refreshStorageUsage();
                    }
                  },
                  error: (err) => {
                    console.error('[Canvas] Erro ao colar token com imagem:', err);
                    this.handleApiError(err);
                  },
                });
              } else {
                const formData = new FormData();
                formData.append('campaignId', this.campaignId);
                formData.append('elementType', CanvasElementType.Image.toString());
                formData.append('x', newX.toString());
                formData.append('y', newY.toString());
                formData.append('z', (++this.maxZ).toString());
                formData.append('scale', (el.scale || 1).toString());
                formData.append('content', el.isRound ? 'round' : el.content || 'square');
                formData.append('image', file, file.name);

                this.canvasElementService.CreateImageElement(formData as any).subscribe({
                  next: (res) => {
                    if (res.success && res.data) {
                      const createdEl: ExtendedCanvasElement = {
                        ...res.data,
                        imageUrl:
                          res.data.imageUrl || (res.data as any).image || el.imageUrl,
                        isRound: el.isRound || res.data.content === 'round',
                      };
                      const index = this.elements.findIndex((e) => e.id === res.data!.id);
                      if (index > -1) this.elements[index] = createdEl;
                      else this.elements.push(createdEl);

                      this.selectedElements = [...this.selectedElements, createdEl];
                      this.refreshStorageUsage();
                    }
                  },
                  error: (err) => {
                    console.error('[Canvas] Erro ao colar imagem do canvas:', err);
                    this.handleApiError(err);
                  },
                });
              }
            })
            .catch((err) => {
              console.error('[Canvas] Erro ao obter blob da imagem copiada:', err);
              this.showError('Não foi possível duplicar a imagem selecionada.');
            });

        // 3. Demais elementos (Texto, Desenho, Token sem imagem)
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
            },
            error: (err) => {
              console.error('[Canvas] Erro ao colar elemento:', err);
              this.handleApiError(err);
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
            this.saveState();
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
      this.saveState();

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
    if (this.selectedColor.toUpperCase() === colorValue.toUpperCase()) return;
    this.selectedColor = colorValue.toUpperCase();

    if (this.selectedElements.length > 0) {
      this.saveState();
      this.selectedElements.forEach((el) => {
        if (
          el.elementType !== CanvasElementType.Image &&
          !el.isLocked &&
          el.color?.toUpperCase() !== this.selectedColor
        ) {
          el.color = this.selectedColor;
          this.updateElementAPI(el);
        }
      });
    }
  }

  deleteSelected(): void {
    if (!this.isCampaignActive) return;
    const deletable = this.selectedElements.filter((e) => !e.isLocked);
    if (deletable.length === 0) return;
    this.saveState();

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
      this.saveState();
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
      this.saveState();
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
        formData.append('content', isRound ? 'round' : 'square');
        formData.append('Content', isRound ? 'round' : 'square');
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
                isRound: isRound,
                content: isRound ? 'round' : 'square',
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

              const index = this.elements.findIndex((e) => e.id === oldId);
              if (index > -1) {
                this.elements[index] = newEl;
              } else {
                this.elements.push(newEl);
              }
              this.selectedElements = [newEl];
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
      } else {
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
    if (!this.isCroppingCustomToken) {
      this.history.pop();
    }
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

  @HostListener('window:wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if ((event.target as HTMLElement).closest('.canvas-ui')) return;
    event.preventDefault();
    const zoomFactor = 0.08;
    const newScale = event.deltaY < 0 ? this.scale + zoomFactor : this.scale - zoomFactor;
    this.doZoom(newScale, event.clientX, event.clientY);
  }

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

  onPointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('.canvas-ui')) return;
    const targetEl = event.target as Element;
    if (targetEl && targetEl.setPointerCapture) {
      try {
        targetEl.setPointerCapture(event.pointerId);
      } catch (e) {}
    }

    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.hasDragged = false;
    this.dragStartScreen = { x: event.clientX, y: event.clientY };

    if (event.button === 1 || event.button === 2 || !this.isCampaignActive) {
      this.isPanning = true;
      return;
    }

    this.pointerDownState = JSON.stringify(this.elements);
    this.isInteracting = true;
    const wx = this.getWorldX(event.clientX);
    const wy = this.getWorldY(event.clientY);

    if (this.activeTool === 'draw') {
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
      };
      this.elements.push(newDrawing);
      this.activeDrawing = newDrawing;
    } else if (this.activeTool === 'eraser') {
      this.lastPointer = { x: event.clientX, y: event.clientY };
    } else if (this.activeTool === 'cursor') {
      if (!(event.target as HTMLElement).closest('.board-element')) {
        this.selectedElements = [];
        this.selectionBox.active = true;
        this.selectionBox.startX = wx;
        this.selectionBox.startY = wy;
        this.selectionBox.currentX = wx;
        this.selectionBox.currentY = wy;
      }
    }
  }

  onElementDown(event: PointerEvent, element: ExtendedCanvasElement): void {
    if (!this.isCampaignActive) return;
    if (event.button === 1 || event.button === 2) return;

    if (this.activeTool === 'eraser') {
      event.stopPropagation();
      this.isInteracting = true;
      return;
    }

    if (this.activeTool !== 'cursor') return;

    event.stopPropagation();
    const targetEl = event.target as Element;
    if (targetEl && targetEl.setPointerCapture) {
      try {
        targetEl.setPointerCapture(event.pointerId);
      } catch (e) {}
    }

    this.pointerDownState = JSON.stringify(this.elements);
    this.isInteracting = true;
    this.hasDragged = false;
    this.dragStartScreen = { x: event.clientX, y: event.clientY };

    const isMultiSelect = event.ctrlKey || event.shiftKey || event.metaKey;

    if (isMultiSelect) {
      const index = this.selectedElements.indexOf(element);
      if (index > -1) this.selectedElements.splice(index, 1);
      else this.selectedElements.push(element);
    } else {
      if (!this.selectedElements.includes(element)) {
        this.selectedElements = [element];
      }
    }

    if (
      this.selectedElements.length === 1 &&
      element.elementType !== CanvasElementType.Image &&
      element.color
    ) {
      this.selectedColor = element.color.toUpperCase();
    }

    this.lastPointer = { x: event.clientX, y: event.clientY };
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    this.mouseWorldPos = {
      x: this.getWorldX(event.clientX),
      y: this.getWorldY(event.clientY),
    };

    if (this.isPanning) {
      const deltaX = event.clientX - this.lastPointer.x;
      const deltaY = event.clientY - this.lastPointer.y;
      this.panX += deltaX;
      this.panY += deltaY;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      return;
    }

    if (!this.isCampaignActive || !this.isInteracting) return;

    if (
      event.clientX === this.lastPointer.x &&
      event.clientY === this.lastPointer.y &&
      this.activeTool === 'eraser'
    ) {
      return;
    }

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
        }

        const deltaX = event.clientX - this.lastPointer.x;
        const deltaY = event.clientY - this.lastPointer.y;
        const deltaWorldX = deltaX / this.scale;
        const deltaWorldY = deltaY / this.scale;

        this.selectedElements.forEach((el) => {
          if (!el.isLocked) {
            el.x += deltaWorldX;
            el.y += deltaWorldY;

            if (el.elementType === CanvasElementType.Drawing && el.points && el.points.length > 0) {
              el.points.forEach((p) => {
                p.x += deltaWorldX;
                p.y += deltaWorldY;
              });
            }
          }
        });
      }
    }
    this.lastPointer = { x: event.clientX, y: event.clientY };
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (this.isCampaignActive && (this.isPanning || this.isInteracting)) {
      const currentState = JSON.stringify(this.elements);

      if (this.pointerDownState && this.pointerDownState !== currentState) {
        this.history.push(this.pointerDownState);
        if (this.history.length > 30) this.history.shift();
        this.redoHistory = [];

        if (this.activeTool === 'draw' && this.activeDrawing) {
          const drw = this.activeDrawing;
          const req: CreateCanvaElementRequest = {
            campaignId: this.campaignId,
            elementType: CanvasElementType.Drawing,
            x: drw.x,
            y: drw.y,
            z: drw.z,
            scale: drw.scale,
            color: drw.color,
            strokeWidth: drw.strokeWidth,
            points: drw.points,
            image: undefined,
          };

          this.canvasElementService.CreateElement(req).subscribe({
            next: (res) => {
              if (res.success && res.data) {
                const idx = this.elements.findIndex((e) => e.id === drw.id);
                if (idx > -1) this.elements[idx] = res.data;
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
        } else if (
          this.activeTool === 'cursor' &&
          this.selectedElements.length > 0 &&
          !this.selectionBox.active &&
          this.hasDragged
        ) {
          const movable = this.selectedElements.filter((e) => !e.isLocked);
          if (movable.length > 0) {
            const standardElements = movable.filter(
              (e) => e.elementType !== CanvasElementType.Drawing,
            );
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

            const drawings = movable.filter((e) => e.elementType === CanvasElementType.Drawing);
            drawings.forEach((drw) => {
              this.updateElementAPI(drw);
            });
          }
        }
      }
    }

    this.isInteracting = false;
    this.isPanning = false;
    this.selectionBox.active = false;
    this.activeDrawing = null;
    this.hasDragged = false;
  }

  getSvgPath(points?: { x: number; y: number }[]): string {
    if (!points || points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) path += ` L ${points[i].x} ${points[i].y}`;
    return path;
  }
}
