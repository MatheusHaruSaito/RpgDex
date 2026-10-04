import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CharacterService } from '../../services/character-service';
import { AuthService } from '../../services/auth-service';
import { Character } from '../../../models/character';
import { CreateCharacterModal } from '../../modals/create-character-modal/create-character-modal';
import { CreateCharacter } from '../../../models/createCharacter';
import { SkeletonComponent } from '../../components/skeleton/skeleton';

@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateCharacterModal, SkeletonComponent],
  templateUrl: './character-list.html',
  styleUrl: './character-list.css',
})
export class CharacterList implements OnInit {
  private characterService = inject(CharacterService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  characterList: Character[] = [];
  filteredList: Character[] = [];
  searchQuery = '';
  showCreateModal = false;
  isLoading = true; // Controla o estado de carregamento da lista

  ngOnInit(): void {
    this.GetAllCharacters();
  }

  GetAllCharacters(): void {
    this.isLoading = true;
    this.characterService.GetAll().subscribe({
      next: (response) => {
        this.characterList = response.data?.characters ?? [];
        this.onSearch();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao buscar personagens:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredList = [...this.characterList];
      return;
    }
    this.filteredList = this.characterList.filter((char) =>
      char.name.toLowerCase().includes(query),
    );
  }

  navigateToEditor(id: string): void {
    this.router.navigate(['/personagens', id]);
  }

  DeleteCharacter(id: string): void {
    if (!confirm('Tem certeza que deseja excluir este personagem?')) return;

    this.characterService.Delete(id).subscribe({
      next: () => {
        this.GetAllCharacters();
      },
      error: (err) => console.error('Erro ao deletar personagem:', err),
    });
  }

  importCharacter(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const jsonContent = e.target?.result as string;
        const importedData = JSON.parse(jsonContent);

        const formData = new FormData();
        formData.append('name', importedData.name ?? 'Personagem Importado');
        formData.append('description', importedData.description ?? '');

        if (importedData.properties) {
          formData.append(
            'properties',
            typeof importedData.properties === 'string'
              ? importedData.properties
              : JSON.stringify(importedData.properties),
          );
        }

        if (importedData.icon && importedData.icon.startsWith('data:image')) {
          const iconFile = this.base64ToFile(importedData.icon, 'imported_avatar.webp');
          formData.append('icon', iconFile, iconFile.name);
        }

        this.characterService.Post(formData as unknown as CreateCharacter).subscribe({
          next: () => {
            this.GetAllCharacters();
            alert('Personagem importado e salvo com sucesso!');
            input.value = '';
          },
          error: (err) => {
            console.error('Erro ao salvar personagem importado:', err);
            alert('Erro ao salvar o personagem na API.');
          },
        });
      } catch (err) {
        console.error('Erro ao ler o arquivo JSON:', err);
        alert('Arquivo JSON inválido ou corrompido.');
      }
    };
    reader.readAsText(file);
  }

  private base64ToFile(base64String: string, filename: string): File {
    const cleanedBase64 = base64String.replace(/\s/g, '');

    const arr = cleanedBase64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/webp';

    const base64Data = arr.length > 1 ? arr[1] : arr[0];
    const bstr = atob(base64Data);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}