import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { NgxColorsModule } from 'ngx-colors';

export type ToolMode = 'cursor' | 'draw';

export interface CanvasElement {
  id: string;
  type: 'token' | 'text' | 'image' | 'drawing';
  x: number;
  y: number;
  z: number;
  scale: number;
  content?: string;
  color?: string;
  imageUrl?: string;
  points?: { x: number, y: number }[];
  strokeWidth?: number;
}

@Component({
  selector: 'app-campaign-canvas',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ImageCropperComponent, 
    NgxColorsModule
  ],
  templateUrl: './campaign-canvas.html',
  styleUrls: ['./campaign-canvas.css']
})
export class CampaignCanvasComponent implements OnInit {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  campaignId: string = '';

  // ── CÂMERA E ESTADOS ──
  scale: number = 1;
  panX: number = 0;
  panY: number = 0;

  activeTool: ToolMode = 'cursor';
  brushSize: number = 4;
  
  isInteracting: boolean = false;
  isPanning: boolean = false;
  
  // ── SELEÇÃO E CAIXA DE SELEÇÃO ──
  selectedElements: CanvasElement[] = [];
  selectionBox = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };
  
  activeDrawing: CanvasElement | null = null;
  lastPointer = { x: 0, y: 0 };
  maxZ: number = 10;

  elements: CanvasElement[] = [];
  
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

  // ── CONTROLOS DE TECLADO ──
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

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

  // ── PREVINE MENU NATIVO AO MOVER CÂMERA COM BOTÃO DIREITO ──
  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: Event): void {
    event.preventDefault();
  }

  // ── COPY / CUT / PASTE (SUPORTA SELEÇÃO MÚLTIPLA) ──
  @HostListener('window:copy', ['$event'])
  onCopy(event: ClipboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (this.selectedElements.length > 0) {
      const data = JSON.stringify({ isRpgDexElements: true, elements: this.selectedElements });
      event.clipboardData?.setData('text/plain', data);
      event.preventDefault();
    }
  }

  @HostListener('window:cut', ['$event'])
  onCut(event: ClipboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (this.selectedElements.length > 0) {
      const data = JSON.stringify({ isRpgDexElements: true, elements: this.selectedElements });
      event.clipboardData?.setData('text/plain', data);
      this.deleteSelected();
      event.preventDefault();
    }
  }

  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    const items = event.clipboardData?.items;
    const textData = event.clipboardData?.getData('text/plain');

    if (textData && textData.includes('isRpgDexElements')) {
      try {
        const parsed = JSON.parse(textData);
        if (parsed.isRpgDexElements && Array.isArray(parsed.elements)) {
          this.saveState();
          const pastedElements: CanvasElement[] = [];
          
          parsed.elements.forEach((el: CanvasElement) => {
            const newEl = { ...el };
            newEl.id = Date.now().toString() + Math.random().toString();
            this.maxZ++;
            newEl.z = this.maxZ;
            newEl.x += 40; 
            newEl.y += 40;
            this.elements.push(newEl);
            pastedElements.push(newEl);
          });
          
          this.selectedElements = pastedElements;
          event.preventDefault();
          return;
        }
      } catch (e) {}
    }

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              this.saveState();
              const el = this.createElement('image');
              el.imageUrl = e.target?.result as string;
              this.elements.push(el);
              this.selectedElements = [el];
            };
            reader.readAsDataURL(file);
            event.preventDefault();
            return;
          }
        }
      }
    }

    if (textData && textData.trim() !== '') {
      this.saveState();
      const el = this.createElement('text', textData);
      this.elements.push(el);
      this.selectedElements = [el];
      event.preventDefault();
    }
  }

  // ── FERRAMENTAS & ADIÇÃO ──
  setTool(tool: ToolMode): void {
    this.activeTool = tool;
    this.selectedElements = [];
  }

  addToken(): void {
    const name = prompt('Nome do Token:');
    if (!name) return;
    this.saveState();
    const el = this.createElement('token', name);
    this.elements.push(el);
    this.setTool('cursor');
    this.selectedElements = [el];
  }

  addText(): void {
    const text = prompt('Digite sua anotação:');
    if (!text) return;
    this.saveState();
    const el = this.createElement('text', text);
    this.elements.push(el);
    this.setTool('cursor');
    this.selectedElements = [el];
  }

  triggerImageUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.saveState();
        const el = this.createElement('image');
        el.imageUrl = e.target?.result as string;
        this.elements.push(el);
        this.setTool('cursor');
        this.selectedElements = [el];
      };
      reader.readAsDataURL(input.files[0]);
    }
    input.value = ''; 
  }

  createElement(type: CanvasElement['type'], content?: string): CanvasElement {
    this.maxZ++;
    return {
      id: Date.now().toString(),
      type: type,
      content: content,
      x: this.getWorldX(window.innerWidth / 2) - 50,
      y: this.getWorldY(window.innerHeight / 2) - 50,
      z: this.maxZ,
      scale: 1,
      color: this.selectedColor
    };
  }

  onColorChange(colorValue: string): void {
    if (this.selectedElements.length > 0) {
      this.saveState();
      this.selectedElements.forEach(el => {
        if (el.type !== 'image') el.color = colorValue;
      });
    }
    this.selectedColor = colorValue;
  }

  // ── EDIÇÃO E MENU DE CONTEXTO ──
  deleteSelected(): void {
    if (this.selectedElements.length === 0) return;
    this.saveState();
    this.elements = this.elements.filter(e => !this.selectedElements.includes(e));
    this.selectedElements = [];
  }

  bringForward(): void {
    if (this.selectedElements.length === 0) return;
    this.saveState();
    this.selectedElements.forEach(el => {
      this.maxZ++;
      el.z = this.maxZ;
    });
    this.sortElements();
  }

  sendBackward(): void {
    if (this.selectedElements.length === 0) return;
    this.saveState();
    const minZ = Math.min(...this.elements.map(e => e.z)) - 1;
    this.selectedElements.forEach(el => {
      el.z = minZ; // Empurra todos para o fundo
    });
    this.sortElements();
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
    if (this.selectedElements.length === 1 && this.selectedElements[0].type === 'image') {
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
      reader.onloadend = () => { this.tempCroppedBase64 = reader.result as string; };
    } else if (event.objectUrl) {
      this.tempCroppedBase64 = event.objectUrl;
    }
  }

  saveCrop(): void {
    if (this.selectedElements.length === 1 && this.tempCroppedBase64) {
      this.selectedElements[0].imageUrl = this.tempCroppedBase64;
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
    setTimeout(() => this.cropImageSource = temp, 10);
  }

  isBase64Url(url: string): boolean {
    return url ? url.startsWith('data:image') : false;
  }

  // ── CÂMERA E ZOOM ──
  getWorldX(screenX: number): number { return (screenX - this.panX) / this.scale; }
  getWorldY(screenY: number): number { return (screenY - this.panY) / this.scale; }

  centerCamera(): void {
    this.scale = 1; this.panX = 0; this.panY = 0;
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

  zoomIn(): void { this.doZoom(this.scale + 0.2, window.innerWidth / 2, window.innerHeight / 2); }
  zoomOut(): void { this.doZoom(this.scale - 0.2, window.innerWidth / 2, window.innerHeight / 2); }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if ((event.target as HTMLElement).closest('.canvas-ui')) return;
    event.preventDefault();
    const zoomFactor = 0.08;
    const newScale = event.deltaY < 0 ? this.scale + zoomFactor : this.scale - zoomFactor;
    this.doZoom(newScale, event.clientX, event.clientY);
  }

  // ── SELEÇÃO MÚLTIPLA: LÓGICA DE DETEÇÃO ──
  getMin(a: number, b: number): number { return Math.min(a, b); }
  getAbs(val: number): number { return Math.abs(val); }

  updateSelectionBoxIntersection(): void {
    const boxWorldX = this.getWorldX(Math.min(this.selectionBox.startX, this.selectionBox.currentX));
    const boxWorldY = this.getWorldY(Math.min(this.selectionBox.startY, this.selectionBox.currentY));
    const boxWorldW = Math.abs(this.selectionBox.currentX - this.selectionBox.startX) / this.scale;
    const boxWorldH = Math.abs(this.selectionBox.currentY - this.selectionBox.startY) / this.scale;

    this.selectedElements = this.elements.filter(el => {
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

  // ── INTERAÇÃO DE PONTEIRO ──
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
      const newDrawing: CanvasElement = {
        id: Date.now().toString(),
        type: 'drawing', x: 0, y: 0, z: this.maxZ, scale: 1,
        color: this.selectedColor,
        strokeWidth: this.brushSize,
        points: [{ x: this.getWorldX(event.clientX), y: this.getWorldY(event.clientY) }]
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

  onElementDown(event: PointerEvent, element: CanvasElement): void {
    if (event.button === 1 || event.button === 2) return; 
    if (this.activeTool !== 'cursor') return; 
    
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    
    this.pointerDownState = JSON.stringify(this.elements);
    this.isInteracting = true;

    // Lógica Multi-Seleção (Ctrl ou Shift pressionado)
    const isMultiSelect = event.ctrlKey || event.shiftKey || event.metaKey;

    if (isMultiSelect) {
      const index = this.selectedElements.indexOf(element);
      if (index > -1) {
        // Se já está selecionado, desmarca
        this.selectedElements.splice(index, 1);
      } else {
        // Se não está, adiciona à seleção
        this.selectedElements.push(element);
      }
    } else {
      // Clique normal (sem Ctrl/Shift)
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
        y: this.getWorldY(event.clientY)
      });
    } 
    else if (this.activeTool === 'cursor') {
      if (this.selectionBox.active) {
        this.selectionBox.currentX = event.clientX;
        this.selectionBox.currentY = event.clientY;
        this.updateSelectionBoxIntersection();
      } else {
        const deltaX = event.clientX - this.lastPointer.x;
        const deltaY = event.clientY - this.lastPointer.y;

        if (this.selectedElements.length > 0) {
          this.selectedElements.forEach(el => {
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
      if (this.pointerDownState && this.pointerDownState !== currentState && (this.selectedElements.length > 0 || this.activeDrawing)) {
        this.history.push(this.pointerDownState);
        if (this.history.length > 30) this.history.shift();
        this.redoHistory = [];
      }
    }
    
    this.isInteracting = false;
    this.isPanning = false;
    this.selectionBox.active = false;
    this.activeDrawing = null;
  }

  getSvgPath(points?: {x: number, y: number}[]): string {
    if (!points || points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) path += ` L ${points[i].x} ${points[i].y}`;
    return path;
  }
}