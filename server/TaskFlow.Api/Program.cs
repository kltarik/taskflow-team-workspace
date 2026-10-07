using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// --- Services ---------------------------------------------------------------

builder.Services.AddDbContext<AppDb>(o => o
    .UseNpgsql(builder.Configuration.GetConnectionString("Default"))
    .UseSnakeCaseNamingConvention()); // TaskItem.DueAt -> task_items.due_at

// Enums travel as strings ("in_progress"); numbers like 7 are rejected instead of silently accepted.
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)));

// Malformed JSON is a 400 in every environment (by default Development throws and it would become a 500).
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = false);

builder.Services.AddValidation();     // enforces the [Required]/[StringLength] attributes on request DTOs
builder.Services.AddProblemDetails(); // every error body has the same JSON shape
builder.Services.AddOpenApi();        // API docs at /openapi/v1.json

// Session auth via an HttpOnly cookie: JavaScript can't read it, so an XSS bug can't steal it.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.Name = "taskflow.auth";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Strict; // not sent on cross-site requests (CSRF protection)
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // Secure automatically under HTTPS
        o.ExpireTimeSpan = TimeSpan.FromHours(8);
        o.SlidingExpiration = true;
        // An API answers 401/403; it must not redirect to an HTML login page.
        o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
        o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; };
    });
builder.Services.AddAuthorization();

// Slow down password guessing: 10 login attempts per minute per IP address.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

// --- Database: apply migrations and seed demo data on startup ---------------

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    await db.Database.MigrateAsync();
    await SeedData.RunAsync(db);
}

// --- HTTP pipeline ----------------------------------------------------------

app.UseExceptionHandler(); // unhandled exceptions -> 500 ProblemDetails, no stack traces leaked
app.UseStatusCodePages();  // bare 401/403/404 get a ProblemDetails body too
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.MapGet("/health", async (AppDb db) =>
    await db.Database.CanConnectAsync()
        ? Results.Ok(new { status = "ok" })
        : Results.Problem("Database unavailable.", statusCode: 503));

var api = app.MapGroup("/api").RequireAuthorization(); // everything under /api needs login...
api.MapAuthEndpoints();                                 // ...except /api/auth/login (AllowAnonymous)
api.MapProjectEndpoints();
api.MapTaskEndpoints();
api.MapDashboardEndpoints();

// In production the built Angular app is copied into wwwroot and served from here (same origin, no CORS).
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();
