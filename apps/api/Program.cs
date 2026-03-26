var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.Configure<DatabaseOptions>(
    builder.Configuration.GetSection(DatabaseOptions.SectionName));

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSingleton<LegacyCmsConnectionFactory>();
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IDownloadRepository, DownloadRepository>();
builder.Services.AddScoped<IUserProfileRepository, UserProfileRepository>();
builder.Services.AddScoped<IUserSettingsRepository, UserSettingsRepository>();
builder.Services.AddSingleton<IAuthTokenFactory, AuthTokenFactory>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserSettingsService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("WebDev", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://localhost:5173",
                "https://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors("WebDev");
}

app.UseHttpsRedirection();
app.UseMiddleware<CmsAuthMiddleware>();

app.MapHealthEndpoints();
app.MapConfigEndpoints();
app.MapDownloadEndpoints();
app.MapAuthEndpoints();
app.MapUserProfileEndpoints();
app.MapUserSettingsEndpoints();

app.Run();

public partial class Program
{
}
