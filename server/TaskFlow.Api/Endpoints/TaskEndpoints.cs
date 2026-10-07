using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;

namespace TaskFlow.Api.Endpoints;


public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/tasks");

        g.MapGet("/{id:int}", async (int id, ClaimsPrincipal user, AppDb db) =>
        {
            var dto = await db.TaskItems.Where(t => t.Id == id).Select(TaskDto.FromEntity)
            .SingleOrDefaultAsync();
            if (dto is null || !await db.IsMember(dto.ProjectId, user.UserId()))
                return Helpers.NotFound("Task");
            return Results.Ok(dto);
        });

        g.MapPatch("/{id:int}", async (int id, UpdateTaskRequest req, ClaimsPrincipal user, AppDb db) =>
        {
            var uid = user.UserId();
            var task = await db.TaskItems.FindAsync(id);
            if (task is null) return Helpers.NotFound("Task");
            var role = await db.RoleInProject(task.ProjectId, uid);
            if(role is null) return Helpers.NotFound("Task");
            if(!Rules.CanUpdateTask(role, task.AssigneeId == uid, req))
                return Helpers.Forbidden("You don't have permission to make this change.");
            if (req.AssigneeId is int a && !await db.IsMember(task.ProjectId, a))
                return Helpers.BadRequest("The assignee must be a member of this project.");

            if (req.Title is not null) task.Title = req.Title.Trim();
            if (req.Description is not null) task.Description = req.Description.Trim();
            if (req.AssigneeId is not null) task.AssigneeId = req.AssigneeId;
            if (req.Status is not null) task.Status = req.Status.Value;
            if (req.Priority is not null) task.Priority = req.Priority.Value;
            if (req.DueAt is not null) task.DueAt = req.DueAt.Value.UtcDateTime;
            task.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(await db.TaskItems.Where(t => t.Id == id).Select(TaskDto.FromEntity).SingleAsync());
        });

        g.MapDelete("/{id:int}", async (int id, ClaimsPrincipal user, AppDb db) =>
        {
            var task = await db.TaskItems.FindAsync(id);
            if (task is null) return Helpers.NotFound("Task");
            var role = await db.RoleInProject(task.ProjectId, user.UserId());
            if (role is null) return Helpers.NotFound("Task");
            if (!Rules.CanManage(role)) return Helpers.Forbidden("Only a manager can delete tasks.");

            db.TaskItems.Remove(task);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        g.MapGet("/{id:int}/comments", async (int id, ClaimsPrincipal user, AppDb db) =>
        {
            var projectId = await db.TaskItems.Where(t => t.Id == id).Select(t => (int?)t.ProjectId).SingleOrDefaultAsync();
            if (projectId is null || !await db.IsMember(projectId.Value, user.UserId())) return Helpers.NotFound("Task");

            return Results.Ok(await db.Comments.Where(c => c.TaskId == id).OrderBy(c => c.CreatedAt)
                .Select(c => new CommentDto(c.Id, c.AuthorId, c.Author.Name, c.Body, c.CreatedAt))
                .ToListAsync());
        });

        g.MapPost("/{id:int}/comments", async (int id, CreateCommentRequest req, ClaimsPrincipal user, AppDb db) =>
        {
            var uid = user.UserId();
            var projectId = await db.TaskItems.Where(t => t.Id == id).Select(t => (int?)t.ProjectId).SingleOrDefaultAsync();
            if (projectId is null || !await db.IsMember(projectId.Value, uid)) return Helpers.NotFound("Task");

            var comment = new Comment { TaskId = id, AuthorId = uid, Body = req.Body.Trim() };
            db.Comments.Add(comment);
            await db.SaveChangesAsync();
            var authorName = await db.Users.Where(u => u.Id == uid).Select(u => u.Name).SingleAsync();
            return Results.Created($"/api/tasks/{id}/comments",
                new CommentDto(comment.Id, uid, authorName, comment.Body, comment.CreatedAt));
        });
    }
}