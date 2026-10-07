using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;

namespace TaskFlow.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this RouteGroupBuilder api)
    {
        // bucket = open | due_soon | overdue | completed. Without it, the list is the 5 most recently updated tasks.
        api.MapGet("/dashboard/summary", async (string? bucket, ClaimsPrincipal user, AppDb db) =>
        {
            var uid = user.UserId();
            var now = DateTime.UtcNow;
            var soon = now.AddDays(7);
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var all = db.TaskItems.Where(t => t.Project.Members.Any(m => m.UserId == uid)); // only my projects
            var open = all.Where(t => t.Status != TaskState.done);
            var dueSoon = open.Where(t => t.DueAt >= now && t.DueAt <= soon);
            var overdue = open.Where(t => t.DueAt < now);
            // ponytail: "completed" = done and last updated this month; add a completed_at column if exact dates matter.
            var completed = all.Where(t => t.Status == TaskState.done && t.UpdatedAt >= monthStart);

            var list = bucket switch
            {
                "open" => open, "due_soon" => dueSoon, "overdue" => overdue, "completed" => completed,
                _ => null,
            };
            var tasks = list is null
                ? all.OrderByDescending(t => t.UpdatedAt).Take(5)
                : list.OrderBy(t => t.DueAt).ThenByDescending(t => t.Priority).Take(50);

            return new DashboardDto(
                await open.CountAsync(), await dueSoon.CountAsync(), await overdue.CountAsync(),
                await completed.CountAsync(), await tasks.Select(TaskDto.FromEntity).ToListAsync());
        });
    }
}
