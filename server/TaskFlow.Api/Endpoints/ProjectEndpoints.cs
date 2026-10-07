using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;

namespace TaskFlow.Api.Endpoints;


public static class ProjectEndpoints
{
    const int MaxPageSize = 50;

    public static void MapProjectEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/users", (AppDb db) =>
            db.Users.OrderBy(u => u.Name).Select(u => new UserDto(u.Id, u.Name)).
            ToListAsync());

        var g = api.MapGroup("/projects");

        g.MapGet("/", (ClaimsPrincipal user, AppDb db) =>
        {
            var uid = user.UserId();
            return db.Projects
                .Where(p => p.Members.Any(m => m.UserId == uid))
                .OrderBy(p => p.Name)
                .Select(p => new ProjectSummaryDto(p.Id, p.Name, p.Description, p.Members.Count, 
                p.Tasks.Count, p.Tasks.Count(t => t.Status == TaskState.done)))
                .ToListAsync();
        });

        g.MapPost("/", async (CreateProjectRequest req, ClaimsPrincipal user, AppDb db) =>
        {
            var uid = user.UserId();
            var project = new Project { Name = req.Name.Trim(), Description = req.
            Description?.Trim() ?? "", OwnerId = uid};
            project.Members.Add(new ProjectMember { UserId = uid, Role = ProjectRole.
            manager});
            db.Projects.Add(project);
            await db.SaveChangesAsync();
            return Results.Created($"/api/projects/{project.Id}", 
                new ProjectSummaryDto(project.Id, project.Name, project.Description, 
                1, 0, 0));
        });

        g.MapGet("/{id:int}", async (int id, ClaimsPrincipal user, AppDb db) =>
        {
            var role = await db.RoleInProject(id, user.UserId());
            if (role is null) return Helpers.NotFound("Project");

            var dto = await db.Projects.Where(p => p.Id == id)
            .Select(p => new ProjectDetailDto(p.Id, p.Name, p.Description, role.Value, 
                    p.Members.OrderBy(m => m.Role).ThenBy(m => m.User.Name)
                    .Select(m => new MemberDto(m.UserId, m.User.Name, m.Role)).ToList())).SingleAsync();

            return Results.Ok(dto);
        });

        g.MapPost("/{id:int}/members", async (int id, AddMemberRequest req, ClaimsPrincipal user, AppDb db) =>
        {
            var role = await db.RoleInProject(id, user.UserId());
            if (role is null) return Helpers.NotFound("Project");
            if (!Rules.CanManage(role)) return Helpers.Forbidden("Only a manager can add members.");

            var newUser = await db.Users.FindAsync(req.UserId);
            if (newUser is null) return Helpers.BadRequest("That user does not exist.");
            if (await db.IsMember(id, req.UserId)) return Helpers.BadRequest("That user is already a member");

            db.ProjectMembers.Add(new ProjectMember { ProjectId = id, UserId = req.UserId, Role = ProjectRole.member});
            await db.SaveChangesAsync();

            return Results.Created($"/api/projects/{id}", new MemberDto(newUser.Id, newUser.Name, ProjectRole.member));          
        });

        g.MapGet("/{id:int}/tasks", async (int id, TaskState? status, int? assignee, int? page, int?pageSize, ClaimsPrincipal user, AppDb db) =>
        {
            if (await db.RoleInProject(id, user.UserId()) is null) return Helpers.NotFound("Project");

            var q = db.TaskItems.Where(t => t.ProjectId == id);
            if (status is not null) q = q.Where(t => t.Status ==status);
            if (assignee is not null) q = q.Where(t => t.AssigneeId == assignee);

            var size = Math.Clamp(pageSize ?? 20, 1, MaxPageSize);
            var p = Math.Max(page ?? 1, 1);
            var total = await q.CountAsync();
            var items = await q
                .OrderBy(t => t.DueAt)
                .ThenByDescending(t => t.Priority)
                .ThenBy(t => t.Id)
                .Skip((p - 1) * size).Take(size)
                .Select(TaskDto.FromEntity)
                .ToListAsync();
            return Results.Ok(new Paged<TaskDto>(items, p, size, total)); 
        });

        g.MapPost("/{id:int}/tasks", async (int id, CreateTaskRequest req, ClaimsPrincipal user, AppDb db) =>
        {
            var uid = user.UserId();
            var role = await db.RoleInProject(id, uid);
            if (role is null) return Helpers.NotFound("Project");
            if( !Rules.CanManage(role)) return Helpers.Forbidden("Only a manager can create tasks.");
            if (req.AssigneeId is int a && !await db.IsMember(id, a)) return Helpers.BadRequest("The assignee must be a member of this project.");

            var task = new TaskItem
            {
                ProjectId = id, Title = req.Title.Trim(), Description = req.Description?.Trim() ?? "",
                AssigneeId = req.AssigneeId, Priority = req.Priority, DueAt = req.DueAt?.UtcDateTime, CreatedById = uid
            };
            db.TaskItems.Add(task);
            await db.SaveChangesAsync();
            var dto = await db.TaskItems.Where(t => t.Id == task.Id).Select(TaskDto.FromEntity).SingleAsync();
            return Results.Created($"/api/tasks/{task.Id}", dto);
        });
    }
}
