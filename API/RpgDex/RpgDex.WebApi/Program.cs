using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using RpgDex.Application;
using RpgDex.Application.Mapping;
using RpgDex.Infrastructure;
using RpgDex.Infrastructure.Hubs;

var builder = WebApplication.CreateBuilder(args);
BsonSerializer.RegisterSerializer(new GuidSerializer(GuidRepresentation.Standard));

var baseUrl = builder.Configuration["ApiSettings:BaseUrl"] ?? "http://localhost:8080";
MappingConfig.Configure(baseUrl);

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApplicationServices();

//builder.Services.AddOptions();

var app = builder.Build();


app.UseForwardedHeaders();
app.UseRouting();

app.UseCors("PermitirTudo");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();  

app.MapControllers();
app.MapHub<CampaignChatHub>("/hubs/campaign-chat");

app.Run();
