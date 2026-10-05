import { inject, Injectable } from '@angular/core';
import { ApiResponse } from '../../models/apiResponse';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { CreateUserDocumentRequest } from '../../models/createUserDocumentRequest';
import { UpdateUserDocumentRequest } from '../../models/updateUserDocumentRequest';
import { UserDocumentResponse } from '../../models/userDocumentResponse';

@Injectable({
  providedIn: 'root',
})
export class UserDocumentService {
  private readonly controller = 'UserDocument';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;

  private http = inject(HttpClient);

  UploadDocument(
    request: CreateUserDocumentRequest,
  ): Observable<ApiResponse<UserDocumentResponse>> {
    const formData = new FormData();
    formData.append('name', request.name);
    formData.append('description', request.description || '');
    formData.append('file', request.file);

    return this.http.post<ApiResponse<UserDocumentResponse>>(`${this.env}`, formData);
  }

  GetAllByUserId(
    page: number = 1,
    pageSize: number = 20,
  ): Observable<ApiResponse<UserDocumentResponse[]>> {
    return this.http.get<ApiResponse<UserDocumentResponse[]>>(`${this.env}`, {
      params: { page, pageSize },
    });
  }

  GetById(id: string): Observable<ApiResponse<UserDocumentResponse>> {
    return this.http.get<ApiResponse<UserDocumentResponse>>(`${this.env}/${id}`);
  }

  Update(request: UpdateUserDocumentRequest): Observable<ApiResponse<UserDocumentResponse>> {
    const formData = new FormData();
    formData.append('id', request.id);
    formData.append('name', request.name);
    formData.append('userId', request.userId);
    formData.append('description', request.description || '');

    // Adiciona o ficheiro apenas se um novo tiver sido selecionado
    if (request.file instanceof File) {
      formData.append('file', request.file, request.file.name);
    }

    return this.http.put<ApiResponse<UserDocumentResponse>>(`${this.env}`, formData);
  }

  Deactivate(request: { id: string }): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/Deactivate`, request);
  }

  Activate(request: { id: string }): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/Activate`, request);
  }

  GiveAccess(request: { documentId: string; userId: string }): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/GiveAccess`, request);
  }

  RemoveAccess(request: { documentId: string; userId: string }): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/RemoveAccess`, request);
  }
}
