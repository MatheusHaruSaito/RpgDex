import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Character } from '../../models/character';
import { Observable } from 'rxjs';
import { UpdateCharacter } from '../../models/updateCharacter';
import { ApiResponse } from '../../models/apiResponse';
import { CreateCharacter } from '../../models/createCharacter';
import { GetAllCharacterResponse } from '../../models/getAllCharacterResponse';

@Injectable({
  providedIn: 'root',
})
export class CharacterService {
  private readonly controller = 'Character';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;

  constructor(private http: HttpClient) {}

  public Post(character: CreateCharacter): Observable<ApiResponse<Character>> {
    return this.http.post<ApiResponse<Character>>(this.env, character);
  }

  public GetAll(): Observable<ApiResponse<GetAllCharacterResponse>> {
    return this.http.get<ApiResponse<GetAllCharacterResponse>>(`${this.env}/All`);
  }
  public GetAllByPage(
    page: number,
    pageSize: number,
  ): Observable<ApiResponse<GetAllCharacterResponse>> {
    return this.http.get<ApiResponse<GetAllCharacterResponse>>(
      `${this.env}/All/${page}/${pageSize}`,
    );
  }

  public GetById(Id: String): Observable<ApiResponse<Character>> {
    return this.http.get<ApiResponse<Character>>(`${this.env}/${Id}`);
  }

  public GetAllFromCampaign(campaignId: string): Observable<ApiResponse<GetAllCharacterResponse>> {
    const params: Record<string, string> = { campaignId };
    return this.http.get<ApiResponse<GetAllCharacterResponse>>(`${this.env}/All/campaign`, {
      params,
    });
  }
  public Delete(Id: String): Observable<ApiResponse<Character>> {
    return this.http.put<ApiResponse<Character>>(`${this.env}/SetActiveState/${Id}`, '');
  }

  public Update(character: UpdateCharacter): Observable<ApiResponse<Character>> {
    return this.http.put<ApiResponse<Character>>(this.env, character);
  }
  public PatchLastAccess(id: string): Observable<ApiResponse<Character>> {
    return this.http.patch<ApiResponse<Character>>(`${this.env}/LastAccess/${id}`, '');
  }
}
