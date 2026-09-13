using Mapster;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using RpgDex.Application.Dto;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using static System.Net.WebRequestMethods;
namespace RpgDex.Application.Mapping
{
    public class MappingConfig
    {
        public static void Configure(string baseUrl = "http://localhost:8080")
        {
            //Mapeamentos para Character podem ser adicionados aqui, se necessário
            TypeAdapterConfig<CreateCharacterRequest, Character>
                .NewConfig()
                .Ignore(dest => dest.Id)
                .Map(dest => dest.Properties, src => ConvertToBsonDocument(src.Properties));

            TypeAdapterConfig<Character, CharacterResponse>
                .NewConfig()
                .Map(dest => dest.Properties, src => ConvertToDictionary(src.Properties))
                    .Map(dest => dest.IconPath, src => string.IsNullOrEmpty(src.IconPath) 
                    ? null 
                    :$"{baseUrl}/api/File/{src.IconPath}"); //Tirar isso quando Implementar o uso  do cloudflare r2 / Solução Temporaria para mostrar a imagem

            TypeAdapterConfig<UpdateCharacterRequest, Character>
                .NewConfig()
                .Map(dest => dest.Properties, src => ConvertToBsonDocument(src.Properties));


            //Mapeamentos para ApplicationUser podem ser adicionados aqui, se necessário
            if (!BsonClassMap.IsClassMapRegistered(typeof(ApplicationUser)))
            {
                BsonClassMap.RegisterClassMap<ApplicationUser>(cm =>
                {
                    cm.AutoMap();
                });
            }
            
            TypeAdapterConfig<CreateUserDTO, ApplicationUser>
                 .NewConfig()
                 .Ignore(dest => dest.PasswordHash)
                 .Map(dest => dest.UserName, src => src.UserName)
                 .Map(dest => dest.Email, src => src.Email);

            TypeAdapterConfig<ApplicationUser, UserResponse>
                 .NewConfig()
                 .Map(dest => dest.UserName, src => src.UserName)
                 .Map(dest => dest.Email, src => src.Email)
                 .Map(dest => dest.IconPath, src => string.IsNullOrEmpty(src.IconPath)
                 ? null
                 : $"{GetApiUrlIfNotFromGoogle(src.IconPath, baseUrl)}{src.IconPath}"); //Tirar isso quando Implementar o uso  do cloudflare r2 / Solução Temporaria para mostrar a imagem


            //Mapeamentos para Campaign podem ser adicionados aqui, se necessário
            TypeAdapterConfig<CreateCampaignRequest, Campaign>
                .NewConfig()
                .Ignore(dest => dest.Id);
            TypeAdapterConfig<Campaign, CampaignResponse>
                .NewConfig()
                .Map(dest => dest.Id, src => src.Id)
                .Map(dest => dest.Title, src => src.Title)
                .Map(dest => dest.Description, src => src.Description)
                .Map(dest => dest.MaxPlayers, src => src.MaxPlayers)
                .Map(dest => dest.PlayerIds, src => src.PlayerIds)
                .Map(dest => dest.CharacterIds, src => src.CharacterIds)
                .Map(dest => dest.CharacterRequests, src => src.CharacterRequests)
                .Map(dest => dest.IconPath, src => string.IsNullOrEmpty(src.IconPath)
                 ? null
                 : $"{baseUrl}/api/File/{src.IconPath}");

            TypeAdapterConfig<ChatMessage, CampaignChatMessagesResponse>
                .NewConfig()
                .Map(dest => dest.UserIcon, src => string.IsNullOrEmpty(src.UserIcon)
                    ? null
                    : $"{baseUrl}/api/File/{src.UserIcon}");
        }
        private static string GetApiUrlIfNotFromGoogle(string iconPath, string baseUrl)
        {
            if (VerifyImageUrl(iconPath))
            {
                return "";
            }
            return $"{baseUrl}/api/File/";
        }
        //Verifies if the image URL is from Google or Discord, if not, it will return false
        private static bool VerifyImageUrl(string imageUrl)
        {
            if (string.IsNullOrEmpty(imageUrl))
            {
                return false;
            }
            // Verifica se a URL contém "googleusercontent.com"
            if (imageUrl.Contains("googleusercontent.com") 
                || imageUrl.Contains("discordapp.com"))
            {
                return true;
            }
            // Se não for uma imagem do Google, retorna null
            return false;
        }

        // Metodos para converter Dictionary<string, object> em BsonDocument

        private static BsonDocument ConvertToBsonDocument(string source)
        {
            if (string.IsNullOrWhiteSpace(source))
            {
                return new BsonDocument();
            }

            try
            {
                return MongoDB.Bson.Serialization.BsonSerializer.Deserialize<BsonDocument>(source);
            }
            catch (Exception)
            {
                return new BsonDocument();
            }
        }
        private static Dictionary<string, object> ConvertToDictionary(BsonDocument source)
        {
            if (source is null || source.ElementCount == 0)
            {
                return new Dictionary<string, object>();
            }
            try
            {
                var dotNetValue = BsonTypeMapper.MapToDotNetValue(source);

                if (dotNetValue is Dictionary<string, object> dictionary)
                {
                    return dictionary;
                }

                if (dotNetValue is IDictionary<string, object> iDictionary)
                {
                    return new Dictionary<string, object>(iDictionary);
                }

                return new Dictionary<string, object>();
            }
            catch
            {
                return new Dictionary<string, object>();
            }
        }
    }
}
