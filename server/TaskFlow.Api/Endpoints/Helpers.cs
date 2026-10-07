using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;

namespace TaskFlow.Api.Endpoints;


public static class Helpers
{
    public static int UserId(this ClaimsPrincipal user) => 
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public static Task<ProjectRole?> RoleInProject(this AppDb db, int projectId, int userId) =>
        db.ProjectMembers
            .Where(m => m.ProjectId == projectId && m.UserId == userId)
            .Select(m => (ProjectRole?)m.Role)
            .SingleOrDefaultAsync();

    public static Task<bool> IsMember(this AppDb db, int projectId, int userId) => 
        db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == userId);

    public static IResult NotFound(string what) => Results.Problem($"{what} not found.", statusCode: 404);
    public static IResult Forbidden(string why) => Results.Problem(why, statusCode: 403);
    public static IResult BadRequest(string why) => Results.Problem(why, statusCode: 400);
}