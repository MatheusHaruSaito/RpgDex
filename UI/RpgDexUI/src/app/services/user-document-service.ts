import { inject, Injectable } from '@angular/core';
import { ApiResponse } from '../../models/apiResponse';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { CreateUserDocumentRequest } from '../../models/createUserDocumentRequest';
import { UpdateUserDocumentRequest } from '../../models/updateUserDocumentRequest';
@Injectable({
  providedIn: 'root',
})
export class UserDocumentService {
  private readonly controller = 'Campaign';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;

  http = inject(HttpClient);

  UploadDocument(request: CreateUserDocumentRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.env}`, request);
  }
  GetAllByUserId(page: number, pageSize: number): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.env}`, {
      params: {
        page,
        pageSize,
      },
    });
  }
  GetById(id: string): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.env}/${id}`);
  }
  Update(request: UpdateUserDocumentRequest): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.env}`, request);
  }
  Deactivate(request: { id: string }): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.env}/Deactivate/`, request);
  }
}
