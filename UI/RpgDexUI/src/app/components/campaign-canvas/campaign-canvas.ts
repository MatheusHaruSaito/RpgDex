import { Component, ElementRef, HostListener, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { NgxColorsModule } from 'ngx-colors';
import { CanvasElementResponse } from '../../../models/canvasElementResponse';
import { CanvasElementType } from '../../../models/canvasElementType';
import { CanvasElementService } from '../../services/canvas-element-service';
import { CreateCanvaElementRequest } from '../../../models/createCanvaElementRequest';
import { MoveCanvaElementsRequest } from '../../../models/moveCanvaElementsRequest';
import { ReOrderCanvaElementsRequest } from '../../../models/reorderCanvaElementsRequest';
import { UpdateCanvaElementRequest } from '../../../models/updateCanvaElementRequest';

export type ToolMode = 'cursor' | 'draw';

@Component({
  selector: 'app-campaign-canvas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ImageCropperComponent, NgxColorsModule],
  templateUrl: './campaign-canvas.html',
  styleUrls: ['./campaign-canvas.css'],
})
export class CampaignCanvasComponent implements OnInit {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  campaignId: string = '';
  canvasElementService = inject(CanvasElementService);

  // Expõe o Enum para o HTML poder utilizá-lo
  public CanvasElementType = CanvasElementType;

  // ── CÂMERA E ESTADOS ──
  scale: number = 1;
  panX: number = 0;
  panY: number = 0;

  activeTool: ToolMode = 'cursor';
  brushSize: number = 4;

  isInteracting: boolean = false;
  isPanning: boolean = false;

  // ── SELEÇÃO E CAIXA DE SELEÇÃO ──
  selectedElements: CanvasElementResponse[] = [];
  selectionBox = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };

  activeDrawing: CanvasElementResponse | null = null;
  lastPointer = { x: 0, y: 0 };
  maxZ: number = 10;

  elements: CanvasElementResponse[] = [];

  // ── HISTÓRICO (UNDO / REDO) ──
  history: string[] = [];
  redoHistory: string[] = [];
  pointerDownState: string = '';

  // ── CORES ──
  selectedColor: string = '#9E74D0';

  // ── CROPPER ESTADOS ──
  isCropping: boolean = false;
  isRoundCrop: boolean = false;
  tempCroppedBase64: string = '';
  cropImageSource: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.campaignId = this.route.snapshot.paramMap.get('id') ?? '';
    this.centerCamera();
    this.loadElements();
  }

  // Obtém o nome do tipo para exibir no HTML
  getElementTypeName(type: CanvasElementType): string {
    return CanvasElementType[type] || 'ELEMENTO';
  }

  // ── INTEGRAÇÃO COM BACKEND: CARREGAR ──
  loadElements(): void {
    this.canvasElementService.GetAllElements(this.campaignId, '1', '1000').subscribe({
      next: (res) => {
        console.log(res);
        if (res.success && res.data) {
          this.elements = res.data.elements;
          if (this.elements.length > 0) {
            this.maxZ = Math.max(...this.elements.map((e) => e.z));
          }
        }
      },
      error: (e) => {
        console.log(e);
      },
    });
  }

  // ── INTEGRAÇÃO COM BACKEND: ATUALIZAR UM ELEMENTO (Update) ──
  updateElementAPI(el: CanvasElementResponse): void {
    const req: UpdateCanvaElementRequest = {
      id: el.id,
      campaignId: this.campaignId,
      scale: el.scale,
      color: el.color,
      content: el.content,
      // Se for imagem e estiver em Base64 (ex: foi recém-cortada ou colada), atualizamos
      imageBase64: this.isBase64Url(el.imageUrl || '') ? el.imageUrl : undefined,
    };

    this.canvasElementService.UpdateElement(req).subscribe();
  }

  // ── SISTEMA DE DESFAZER E REFAZER ──
  saveState(): void {
    this.history.push(JSON.stringify(this.elements));
    if (this.history.length > 30) this.history.shift();
    this.redoHistory = [];
  }

  undo(): void {
    if (this.history.length > 0) {
      this.redoHistory.push(JSON.stringify(this.elements));
      const prevState = this.history.pop()!;
      this.elements = JSON.parse(prevState);
      this.selectedElements = [];
    }
  }

  redo(): void {
    if (this.redoHistory.length > 0) {
      this.history.push(JSON.stringify(this.elements));
      const nextState = this.redoHistory.pop()!;
      this.elements = JSON.parse(nextState);
      this.selectedElements = [];
    }
  }

  // ── CONTROLOS DE TECLADO E CLIPBOARD ──
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
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
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    if (this.selectedElements.length > 0) {
      const data = JSON.stringify({ isRpgDexElements: true, elements: this.selectedElements });
      event.clipboardData?.setData('text/plain', data);
      event.preventDefault();
    }
  }

  @HostListener('window:cut', ['$event'])
  onCut(event: ClipboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    if (this.selectedElements.length > 0) {
      const data = JSON.stringify({ isRpgDexElements: true, elements: this.selectedElements });
      event.clipboardData?.setData('text/plain', data);
      this.deleteSelected();
      event.preventDefault();
    }
  }

  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;

    const items = event.clipboardData?.items;
    const textData = event.clipboardData?.getData('text/plain');

    // 1. Colar elementos copiados do próprio Canvas
    if (textData && textData.includes('isRpgDexElements')) {
      try {
        const parsed = JSON.parse(textData);
        if (parsed.isRpgDexElements && Array.isArray(parsed.elements)) {
          this.saveState();
          const pastedElements: CanvasElementResponse[] = [];

          parsed.elements.forEach((el: CanvasElementResponse) => {
            const req: CreateCanvaElementRequest = {
              campaignId: this.campaignId,
              elementType: el.elementType,
              content: el.content,
              x: el.x + 40,
              y: el.y + 40,
              z: ++this.maxZ,
              scale: el.scale,
              color: el.color,
              strokeWidth: el.strokeWidth,
              points: el.points,
              image: el.elementType === CanvasElementType.Image ? el.imageUrl : undefined,
            };
            console.log('req: ', req);
            this.canvasElementService.CreateElement(req).subscribe({
              next: (res) => {
                console.log(res);

                if (res.success && res.data) {
                  this.elements.push(res.data);
                  pastedElements.push(res.data);
                  this.selectedElements = pastedElements;
                }
              },
              error: (e) => {
                console.log(e);
              },
            });
          });
          event.preventDefault();
          return;
        }
      } catch (e) {}
    }

    // 2. Colar Imagens (Print Screen, etc)
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64String = e.target?.result as string;
              this.saveState();

              const req: CreateCanvaElementRequest = {
                campaignId: this.campaignId,
                elementType: CanvasElementType.Image,
                x: this.getWorldX(window.innerWidth / 2) - 50,
                y: this.getWorldY(window.innerHeight / 2) - 50,
                z: ++this.maxZ,
                scale: 1,
                image: base64String,
              };

              this.canvasElementService.CreateElement(req).subscribe((res) => {
                if (res.success && res.data) {
                  this.elements.push(res.data);
                  this.setTool('cursor');
                  this.selectedElements = [res.data];
                }
              });
            };
            reader.readAsDataURL(file);
            event.preventDefault();
            return;
          }
        }
      }
    }

    // 3. Colar Texto Puro
    if (textData && textData.trim() !== '') {
      this.saveState();
      const req: CreateCanvaElementRequest = {
        campaignId: this.campaignId,
        elementType: CanvasElementType.Text,
        content: textData,
        x: this.getWorldX(window.innerWidth / 2) - 50,
        y: this.getWorldY(window.innerHeight / 2) - 50,
        z: ++this.maxZ,
        scale: 1,
        color: this.selectedColor,
        image: undefined,
      };

      this.canvasElementService.CreateElement(req).subscribe((res) => {
        if (res.success && res.data) {
          this.elements.push(res.data);
          this.setTool('cursor');
          this.selectedElements = [res.data];
        }
      });
      event.preventDefault();
    }
  }

  // ── FERRAMENTAS & ADIÇÃO (CREATE API) ──
  setTool(tool: ToolMode): void {
    this.activeTool = tool;
    this.selectedElements = [];
  }

  addToken(): void {
    const name = prompt('Nome do Token:');
    if (!name) return;
    this.saveState();

    const req: CreateCanvaElementRequest = {
      campaignId: this.campaignId,
      elementType: CanvasElementType.Token,
      content: name,
      x: this.getWorldX(window.innerWidth / 2) - 50,
      y: this.getWorldY(window.innerHeight / 2) - 50,
      z: ++this.maxZ,
      scale: 1,
      color: this.selectedColor,
      image: undefined,
    };

    this.canvasElementService.CreateElement(req).subscribe((res) => {
      if (res.success && res.data) {
        this.elements.push(res.data);
        this.setTool('cursor');
        this.selectedElements = [res.data];
      }
    });
  }

  addText(): void {
    const text = prompt('Digite sua anotação:');
    if (!text) return;
    this.saveState();

    const req: CreateCanvaElementRequest = {
      campaignId: this.campaignId,
      elementType: CanvasElementType.Text,
      content: text,
      x: this.getWorldX(window.innerWidth / 2) - 50,
      y: this.getWorldY(window.innerHeight / 2) - 50,
      z: ++this.maxZ,
      scale: 1,
      color: this.selectedColor,
      image: undefined,
    };

    this.canvasElementService.CreateElement(req).subscribe((res) => {
      if (res.success && res.data) {
        this.elements.push(res.data);
        this.setTool('cursor');
        this.selectedElements = [res.data];
      }
    });
  }

  triggerImageUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        this.saveState();

        const req: CreateCanvaElementRequest = {
          campaignId: this.campaignId,
          elementType: CanvasElementType.Image,
          x: this.getWorldX(window.innerWidth / 2) - 50,
          y: this.getWorldY(window.innerHeight / 2) - 50,
          z: ++this.maxZ,
          scale: 1,
          image: base64String, // Envia como Base64!
        };

        this.canvasElementService.CreateElement(req).subscribe((res) => {
          if (res.success && res.data) {
            this.elements.push(res.data);
            this.setTool('cursor');
            this.selectedElements = [res.data];
          }
        });
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  onColorChange(colorValue: string): void {
    if (this.selectedElements.length > 0) {
      this.saveState();
      this.selectedElements.forEach((el) => {
        if (el.elementType !== CanvasElementType.Image) {
          el.color = colorValue;
          this.updateElementAPI(el); // Atualiza no Backend
        }
      });
    }
    this.selectedColor = colorValue;
  }

  // ── EDIÇÃO, REORDENAMENTO E EXCLUSÃO ──
  deleteSelected(): void {
    if (this.selectedElements.length === 0) return;
    this.saveState();

    const deleteRequest = {
      campaignId: this.campaignId,
      ids: this.selectedElements.map((el) => el.id),
    };
    console.log(deleteRequest);
    this.canvasElementService.DeactiveElement(deleteRequest).subscribe();

    this.elements = this.elements.filter((e) => !this.selectedElements.includes(e));
    this.selectedElements = [];
  }

  bringForward(): void {
    if (this.selectedElements.length === 0) return;
    this.saveState();
    this.selectedElements.forEach((el) => {
      this.maxZ++;
      el.z = this.maxZ;
    });
    this.sortElements();
    this.syncZOrderAPI();
  }

  sendBackward(): void {
    if (this.selectedElements.length === 0) return;
    this.saveState();
    const minZ = Math.min(...this.elements.map((e) => e.z)) - 1;
    this.selectedElements.forEach((el) => {
      el.z = minZ; // Empurra todos para o fundo
    });
    this.sortElements();
    this.syncZOrderAPI();
  }

  syncZOrderAPI(): void {
    const req: ReOrderCanvaElementsRequest = {
      campaignId: this.campaignId,
      items: this.elements.map((el) => ({ id: el.id, z: el.z })),
    };
    this.canvasElementService.ReOrderElement(req).subscribe();
  }

  updateElementScale(event: Event): void {
    if (this.selectedElements.length !== 1) return;
    const input = event.target as HTMLInputElement;
    this.selectedElements[0].scale = parseFloat(input.value);
  }

  sortElements(): void {
    this.elements.sort((a, b) => a.z - b.z);
  }

  // ── CORTE DE IMAGEM ──
  startCropping(): void {
    if (
      this.selectedElements.length === 1 &&
      this.selectedElements[0].elementType === CanvasElementType.Image
    ) {
      this.saveState();
      const currentImage = this.selectedElements[0].imageUrl ?? '';

      this.isCropping = true;
      this.cropImageSource = '';
      this.tempCroppedBase64 = '';

      setTimeout(() => {
        this.cropImageSource = currentImage;
        this.tempCroppedBase64 = currentImage;
      }, 10);
    }
  }

  imageCropped(event: ImageCroppedEvent): void {
    if (event.base64 && event.base64.length > 10) {
      this.tempCroppedBase64 = event.base64;
    } else if (event.blob) {
      const reader = new FileReader();
      reader.readAsDataURL(event.blob);
      reader.onloadend = () => {
        this.tempCroppedBase64 = reader.result as string;
      };
    } else if (event.objectUrl) {
      this.tempCroppedBase64 = event.objectUrl;
    }
  }

  saveCrop(): void {
    if (this.selectedElements.length === 1 && this.tempCroppedBase64) {
      const targetElement = this.selectedElements[0];
      targetElement.imageUrl = this.tempCroppedBase64;
      this.updateElementAPI(targetElement); // Atualiza no C# com o base64 novo
    }
    this.isCropping = false;
    this.cropImageSource = '';
  }

  cancelCrop(): void {
    this.isCropping = false;
    this.cropImageSource = '';
    this.history.pop();
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

  // ── CÂMERA E ZOOM ──
  getWorldX(screenX: number): number {
    return (screenX - this.panX) / this.scale;
  }
  getWorldY(screenY: number): number {
    return (screenY - this.panY) / this.scale;
  }
  centerCamera(): void {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
  }

  doZoom(newScale: number, clientX: number, clientY: number): void {
    newScale = Math.max(0.2, Math.min(newScale, 4));
    if (newScale === this.scale) return;
    const wx = (clientX - this.panX) / this.scale;
    const wy = (clientY - this.panY) / this.scale;
    this.scale = newScale;
    this.panX = clientX - wx * this.scale;
    this.panY = clientY - wy * this.scale;
  }

  zoomIn(): void {
    this.doZoom(this.scale + 0.2, window.innerWidth / 2, window.innerHeight / 2);
  }
  zoomOut(): void {
    this.doZoom(this.scale - 0.2, window.innerWidth / 2, window.innerHeight / 2);
  }

  @HostListener('window:wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if ((event.target as HTMLElement).closest('.canvas-ui')) return;
    event.preventDefault();
    const zoomFactor = 0.08;
    const newScale = event.deltaY < 0 ? this.scale + zoomFactor : this.scale - zoomFactor;
    this.doZoom(newScale, event.clientX, event.clientY);
  }

  // ── SELEÇÃO MÚLTIPLA ──
  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }
  getAbs(val: number): number {
    return Math.abs(val);
  }

  updateSelectionBoxIntersection(): void {
    const boxWorldX = this.getWorldX(
      Math.min(this.selectionBox.startX, this.selectionBox.currentX),
    );
    const boxWorldY = this.getWorldY(
      Math.min(this.selectionBox.startY, this.selectionBox.currentY),
    );
    const boxWorldW = Math.abs(this.selectionBox.currentX - this.selectionBox.startX) / this.scale;
    const boxWorldH = Math.abs(this.selectionBox.currentY - this.selectionBox.startY) / this.scale;

    this.selectedElements = this.elements.filter((el) => {
      const elW = 100 * el.scale;
      const elH = 100 * el.scale;
      return (
        el.x < boxWorldX + boxWorldW &&
        el.x + elW > boxWorldX &&
        el.y < boxWorldY + boxWorldH &&
        el.y + elH > boxWorldY
      );
    });
  }

  // ── INTERAÇÃO DE PONTEIRO (DRAG & DROP API) ──
  onPointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('.canvas-ui')) return;
    (event.target as Element).setPointerCapture(event.pointerId);

    this.pointerDownState = JSON.stringify(this.elements);
    this.lastPointer = { x: event.clientX, y: event.clientY };

    if (event.button === 1 || event.button === 2) {
      this.isPanning = true;
      return;
    }

    this.isInteracting = true;

    if (this.activeTool === 'draw') {
      this.selectedElements = [];
      this.maxZ++;

      const newDrawing: CanvasElementResponse = {
        id: 'temp-' + Date.now().toString(),
        elementType: CanvasElementType.Drawing,
        x: 0,
        y: 0,
        z: this.maxZ,
        scale: 1,
        color: this.selectedColor,
        strokeWidth: this.brushSize,
        points: [{ x: this.getWorldX(event.clientX), y: this.getWorldY(event.clientY) }],
      };
      this.elements.push(newDrawing);
      this.activeDrawing = newDrawing;
    } else {
      if (!(event.target as HTMLElement).closest('.board-element')) {
        this.selectedElements = [];
        this.selectionBox.active = true;
        this.selectionBox.startX = event.clientX;
        this.selectionBox.startY = event.clientY;
        this.selectionBox.currentX = event.clientX;
        this.selectionBox.currentY = event.clientY;
      }
    }
  }

  onElementDown(event: PointerEvent, element: CanvasElementResponse): void {
    if (event.button === 1 || event.button === 2) return;
    if (this.activeTool !== 'cursor') return;

    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);

    this.pointerDownState = JSON.stringify(this.elements);
    this.isInteracting = true;

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

    this.lastPointer = { x: event.clientX, y: event.clientY };
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (this.isPanning) {
      const deltaX = event.clientX - this.lastPointer.x;
      const deltaY = event.clientY - this.lastPointer.y;
      this.panX += deltaX;
      this.panY += deltaY;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      return;
    }

    if (!this.isInteracting) return;

    if (this.activeTool === 'draw' && this.activeDrawing && this.activeDrawing.points) {
      this.activeDrawing.points.push({
        x: this.getWorldX(event.clientX),
        y: this.getWorldY(event.clientY),
      });
    } else if (this.activeTool === 'cursor') {
      if (this.selectionBox.active) {
        this.selectionBox.currentX = event.clientX;
        this.selectionBox.currentY = event.clientY;
        this.updateSelectionBoxIntersection();
      } else {
        const deltaX = event.clientX - this.lastPointer.x;
        const deltaY = event.clientY - this.lastPointer.y;

        if (this.selectedElements.length > 0) {
          this.selectedElements.forEach((el) => {
            el.x += deltaX / this.scale;
            el.y += deltaY / this.scale;
          });
        }
      }
      this.lastPointer = { x: event.clientX, y: event.clientY };
    }
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (this.isPanning || this.isInteracting) {
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

          this.canvasElementService.CreateElement(req).subscribe((res) => {
            if (res.success && res.data) {
              const idx = this.elements.findIndex((e) => e.id === drw.id);
              if (idx > -1) this.elements[idx] = res.data;
            }
          });
        } else if (
          this.activeTool === 'cursor' &&
          this.selectedElements.length > 0 &&
          !this.selectionBox.active
        ) {
          const req: MoveCanvaElementsRequest = {
            campaignId: this.campaignId,
            items: this.selectedElements.map((el) => ({ id: el.id, x: el.x, y: el.y })),
          };
          this.canvasElementService.MoveElement(req).subscribe();
        }
      }
    }

    this.isInteracting = false;
    this.isPanning = false;
    this.selectionBox.active = false;
    this.activeDrawing = null;
  }

  getSvgPath(points?: { x: number; y: number }[]): string {
    if (!points || points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) path += ` L ${points[i].x} ${points[i].y}`;
    return path;
  }
}
