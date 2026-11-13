using MercadoPago.Config;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using Resend;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Services;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;
using RpgDex.Infrastructure.Data;
using RpgDex.Infrastructure.Jobs;
using RpgDex.Infrastructure.Queries;
using RpgDex.Infrastructure.Repositories;
using RpgDex.Infrastructure.Resolvers;
using RpgDex.Infrastructure.Security;
using RpgDex.Infrastructure.Services;
using RpgDex.Infrastructure.Services.FileReferences;
using RpgDex.Infrastructure.Settings;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RpgDex.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
        {
            //Database configuration
            FieldEncryption.Initialize(configuration["ENCRYPTION:CHATKEY"]!);

            BsonClassMap.RegisterClassMap<ChatMessage>(cm =>
            {
                cm.AutoMap();
                cm.GetMemberMap(m => m.Data).SetSerializer(new EncryptedStringSerializer());
            });

            BsonClassMap.RegisterClassMap<MessageRevision>(cm =>
            {
                cm.AutoMap();
                cm.GetMemberMap(m => m.Data).SetSerializer(new EncryptedStringSerializer());
            });

            services.AddSingleton<MongoDbContext>();
            var redisConnection = configuration.GetConnectionString("Redis");
            if (!string.IsNullOrEmpty(redisConnection))
            {
                var config = ConfigurationOptions.Parse(redisConnection);
                config.AbortOnConnectFail = false;
                config.ConnectTimeout = 5000;      

                services.AddSignalR()
                    .AddStackExchangeRedis(options =>
                    {
                        options.Configuration = config;
                    });
            }

            services.AddScoped<IMongoDatabase>(sp =>
            {
                var context = sp.GetRequiredService<MongoDbContext>();
                return context.GetDatabase();
            });

            services.AddScoped<IGridFSBucket>(sp =>
            {
                var database = sp.GetRequiredService<IMongoDatabase>();
                return new GridFSBucket(database);
            });
            //Bind options
            services.Configure<EmailSettings>(configuration.GetSection("EmailSettings"));
            services.Configure<JwtSettings>(configuration.GetSection("Jwt"));
            services.Configure<GoogleAuthSettings>(configuration.GetSection("Google"));
            services.Configure<DiscordSettings>(configuration.GetSection("Discord"));
            services.Configure<ApiSettings>(configuration.GetSection("ApiSettings"));

            //Sercices & repositories
            services.AddScoped<IEmailService, EmailService>();
            services.AddHttpClient<IResend, ResendClient>();
            services.Configure<ResendClientOptions>(o =>
                o.ApiToken = configuration["EmailSettings:ResendApiKey"]
            );
            services.AddTransient<IResend, ResendClient>();

            services.AddScoped<ICharacterRepository, CharacterRepository>();
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<ITokenRepository, TokenRepository>();
            services.AddScoped<IFileRepository, FileRepository>();
            services.AddScoped<ICampaignRepository, CampaignRepository>();
            services.AddScoped<IGoogleAuthService, GoogleAuthService>();
            services.AddScoped<IDiscordAuthService, DiscordAuthService>();
            services.AddScoped<ICampaignChatService, CampaignChatService>();
            services.AddScoped<ICampaignChatRepository, CampaignChatRepository>();
            services.AddScoped<IUserDocumentRepository, UserDocumentRepository>();  
            services.AddScoped<ICanvasElementRepository, CanvasElementRepository>();
            services.AddScoped<IPaymentRepository, PaymentRepository>();
            services.AddScoped<IPlanRepository, PlanRepository>();
            services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
            services.AddScoped<ISubscriptionQueries, SubscriptionQueries>();
            services.AddScoped<IUserDocumentQueries, UserDocumentQueries>();
            services.AddScoped<IWebhookSignatureValidator, MercadoPagoWebhookSignatureValidator>();
            services.AddScoped<ICanvasElementQueries, CanvasElementQueries>();
            services.AddScoped<IReportRepository, ReportRepository>();
            services.AddScoped<IReportQueries, ReportQueries>();
            services.AddScoped<IReportTargetResolver, UserReportTargetResolver>();
            services.AddScoped<IReportTargetResolver, CampaignReportTargetResolver>();
            services.AddScoped<IReportTargetResolver, CharacterReportTargetResolver>();
            services.AddScoped<IUserQueries, UserQueries>();
            services.AddScoped<ICampaignDiceLogRepository, CampaignDiceLogRepository>();
            services.AddScoped<ICharacterQueries, CharacterQueries>();
            services.AddScoped<ICampaignQueries, CampaignQueries>();
            services.AddScoped<ICanvasHubService, CanvasHubService>();
            services.AddSingleton<ILinkTicketService, LinkTicketService>();
            services.AddScoped<IFileReferenceProvider, UserFileReferenceProvider>();
            services.AddScoped<IFileReferenceProvider, CharacterFileReferenceProvider>();
            services.AddScoped<IFileReferenceProvider, CampaignFileReferenceProvider>();
            services.AddScoped<IFileReferenceProvider, CanvasElementsFileReferenceProvider>();
            services.AddScoped<IFileReferenceProvider, UserDocumentFileReferenceProvider>();


            services.AddHostedService<SyncPaymentJob>();
            services.AddHostedService<SubscriptionExpiryJob>();
            services.AddHostedService<OrphanFilesCleanupJob>();
            services.AddHostedService<InactiveCanvasElementsCleanupJob>();

            //Identity
            services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.User.RequireUniqueEmail = true;
            })
            .AddMongoDbStores<ApplicationUser, ApplicationRole, Guid>
            (
                configuration.GetConnectionString("MongoDbConnection"),
                configuration["ConnectionStrings:DatabaseName"]
            ).AddDefaultTokenProviders()
            .AddRoles<ApplicationRole>();

            //Jwt
            var jwtSettings = configuration.GetSection("Jwt").Get<JwtSettings>()
                ?? throw new InvalidOperationException("Jwt Settings Not Found");
            var jwtKey = configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt Not Found");


            services.AddAuthentication(option =>
            {
                option.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                option.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtSettings.Issuer,
                        ValidAudience = jwtSettings.Audience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                        ClockSkew = TimeSpan.Zero,
                        NameClaimType = JwtRegisteredClaimNames.UniqueName
                    };
                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["access_token"];
                            var path = context.HttpContext.Request.Path;

                            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                            {
                                context.Token = accessToken;
                            }
                            return Task.CompletedTask;
                        },
                        OnTokenValidated = async ctx =>
                        {
                            var userManager = ctx.HttpContext.RequestServices
                                .GetRequiredService<UserManager<ApplicationUser>>();

                            var userId = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                                         ?? ctx.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);

                            var user = userId is null ? null : await userManager.FindByIdAsync(userId);

                            if (user is null || await userManager.IsLockedOutAsync(user))
                                ctx.Fail("User is banned.");
                        }
                    };
                })
                .AddDiscord(o =>
                {
                    o.ClientId = configuration["Discord:ClientId"]
                        ?? throw new InvalidOperationException("Discord ClientId Not Found");
                    o.ClientSecret = configuration["Discord:ClientSecret"]
                        ?? throw new InvalidOperationException("Discord ClientSecret Not Found");

                    o.CallbackPath = "/signin-discord";

                    o.Scope.Add("identify");
                    o.Scope.Add("email");

                    o.ClaimActions.MapJsonKey("urn:discord:avatar", "avatar");
                    o.ClaimActions.MapJsonKey("global_name", "global_name");
                    o.SignInScheme = IdentityConstants.ExternalScheme;
                });



            services.AddHttpClient();
            var mpAccessToken = configuration["MercadoPago:AccessToken"]
                                ?? throw new InvalidOperationException("MercadoPago:AccessToken Not Found");
            services.AddHttpClient<IMercadoPagoOrderClient, MercadoPagoOrderClient>(c=>
            {
                c.BaseAddress = new Uri("https://api.mercadopago.com/");
                c.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer",mpAccessToken);
            });
            //Cors

            services.Configure<ForwardedHeadersOptions>(o =>
            {
                o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

                o.KnownIPNetworks.Clear();
                o.KnownProxies.Clear();

            });
            var uiBaseUrl = configuration["ApiSettings:UIBaseUrl"]!.TrimEnd('/');
            var apiBaseUrl = configuration["ApiSettings:BaseUrl"]!.TrimEnd('/');

            var origins = new List<string> { uiBaseUrl, apiBaseUrl };

            if (uiBaseUrl.StartsWith("https://") && !uiBaseUrl.StartsWith("https://www."))
            {
                origins.Add(uiBaseUrl.Insert(8, "www."));
            }
            services.AddCors(options => {
                options.AddPolicy("PermitirTudo", policy => {
                    policy.WithOrigins(origins.Distinct().ToArray())
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
                });
            });


            return services;
        }
    }
}
