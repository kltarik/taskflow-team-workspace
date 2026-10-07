using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;


namespace TaskFlow.Api.Endpoints;


public static class AuthEndpoints
{
    
    public static void MapAuthEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/auth/login", async(LoginRequest req, AppDb db, HttpContext http) =>
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
            var ok = user is not null && new PasswordHasher<User>()
                .VerifyHashedPassword(user, user.PasswordHash, req.Password) !=
                PasswordVerificationResult.Failed;

            if (!ok) return Results.Problem("Invalid email or password.", statusCode:401);

            var identity = new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, user!.Id.ToString())],
                CookieAuthenticationDefaults.AuthenticationScheme);
            await http.SignInAsync(new ClaimsPrincipal(identity));
            return Results.Ok(await Me(db, user.Id));
        })
        .AllowAnonymous()
        .RequireRateLimiting("login");

        api.MapPost("/auth/logout", async(HttpContext http) =>
        {
            await http.SignOutAsync();
            return Results.NoContent();
        });

        api.MapGet("/auth/me", async (ClaimsPrincipal user, AppDb db) =>
            await Me(db, user.UserId()) is { } me ? Results.Ok(me) : Results.Unauthorized() 
        );
    }

    static Task<MeDto?> Me(AppDb db, int userId) => 
        db.Users.Where(u => u.Id == userId)
            .Select(u => new MeDto(u.Id, u.Name, u.Email, 
                db.ProjectMembers.Any(m => m.UserId == u.Id && m.Role == ProjectRole.manager)
                    ? ProjectRole.manager : ProjectRole.member))
            .SingleOrDefaultAsync();






}