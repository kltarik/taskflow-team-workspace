namespace TaskFlow.Api.Data;

public enum TaskState {todo, in_progress, blocked, done}
public enum Priority {low, normal, high}
public enum ProjectRole {manager, member}


public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Project
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string Description { get; set; } = "";
    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<ProjectMember> Members { get; set; } = [];
    public List<TaskItem> Tasks { get; set; } = [];


}

public class ProjectMember
{
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public ProjectRole Role { get; set; }
}

public class TaskItem
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public required string Title { get; set; }
    public string Description { get; set; } = "";
    public int? AssigneeId { get; set; }
    public User? Assignee { get; set; }
    public TaskState Status { get; set; } = TaskState.todo;
    public Priority Priority { get; set; } = Priority.normal;
    public DateTime? DueAt { get; set; }
    public int CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<Comment> Comments { get; set; } = [];
}

public class Comment
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public TaskItem Task { get; set; } = null!;
    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public required string Body { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}