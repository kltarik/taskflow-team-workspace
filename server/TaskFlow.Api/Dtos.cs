using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using TaskFlow.Api.Data;


namespace TaskFlow.Api;

public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);
public record MeDto(int Id, string Name, string Email, ProjectRole DemoRole);
public record UserDto(int Id, string Name);

public record CreateProjectRequest([Required, StringLength(100)] string Name, [StringLength(1000)] string? Description);
public record AddMemberRequest([Range(1, int.MaxValue)] int UserId);
public record ProjectSummaryDto(int Id, string Name, string Description, int MemberCount, int TaskCount, int DoneCount);
public record MemberDto(int UserId, string Name, ProjectRole Role);
public record ProjectDetailDto(int Id, string Name, string Description, ProjectRole MyRole, List<MemberDto> Members);

public record CreateTaskRequest(
    [Required, StringLength(200)] string Title,
    [StringLength(4000)] string? Description,
    int? AssigneeId,
    Priority Priority = Priority.normal,
    DateTimeOffset? DueAt = null
);

public record UpdateTaskRequest(
    [StringLength(200, MinimumLength = 1)] string? Title,
    [StringLength(4000)] string? Description,
    int? AssigneeId,
    TaskState? Status,
    Priority? Priority,
    DateTimeOffset? DueAt
);

public record TaskDto(
    int Id, int ProjectId, string ProjectName, string Title, string Description,
    int? AssigneeId, string? AssigneeName, TaskState Status, Priority Priority,
    DateTime? DueAt, DateTime CreatedAt, DateTime UpdatedAt
)
{
    public static readonly Expression<Func<TaskItem, TaskDto>> FromEntity = t => new TaskDto(
        t.Id, t.ProjectId, t.Project.Name, t.Title, t.Description, t.AssigneeId,
        t.Assignee != null ? t.Assignee.Name : null, t.Status, t.Priority,
        t.DueAt, t.CreatedAt, t.UpdatedAt
    );
}

public record Paged<T>(List<T> Items, int Page, int PageSize, int Total);

public record CreateCommentRequest([Required, StringLength(2000)] string Body);
public record CommentDto(int Id, int AuthorId, string AuthorName, string Body, DateTime CreatedAt);

public record DashboardDto(int Open, int DueSoon, int Overdue, int CompletedThisMonth, List<TaskDto> Tasks);

