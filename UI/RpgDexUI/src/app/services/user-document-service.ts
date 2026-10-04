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
  private readonly controller = 'Campaign';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;

  http = inject(HttpClient);

  UploadDocument(
    request: CreateUserDocumentRequest,
  ): Observable<ApiResponse<UserDocumentResponse>> {
    return this.http.post<ApiResponse<UserDocumentResponse>>(`${this.env}`, request);
  }
  GetAllByUserId(page: number, pageSize: number): Observable<ApiResponse<UserDocumentResponse[]>> {
    return this.http.get<ApiResponse<UserDocumentResponse[]>>(`${this.env}`, {
      params: {
        page,
        pageSize,
      },
    });
  }
  GetById(id: string): Observable<ApiResponse<UserDocumentResponse>> {
    return this.http.get<ApiResponse<UserDocumentResponse>>(`${this.env}/${id}`);
  }
  Update(request: UpdateUserDocumentRequest): Observable<ApiResponse<UserDocumentResponse>> {
    return this.http.put<ApiResponse<UserDocumentResponse>>(`${this.env}`, request);
  }
  Deactivate(request: { id: string }): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.env}/Deactivate/`, request);
  }
  GiveAccess(request: { documentId: string; userId: string }): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.env}/GiveAccess/`, request);
  }
  RemoveAccess(request: { documentId: string; userId: string }): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.env}/RemoveAccess/`, request);
  }
}
