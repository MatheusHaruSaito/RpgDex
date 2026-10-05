using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Services;
using RpgDex.Application.Validators;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text;

namespace RpgDex.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddScoped<ICharacterService, CharacterService>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IFileService, FileService>();
            services.AddScoped<ICampaignService, CampaignService>();
            services.AddScoped<IPasswordHasher<Campaign>, PasswordHasher<Campaign>>();
            services.AddScoped<IUserDocumentService, UserDocumentService>();


            services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
            return services;
        }
    }
}
