using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Data;


public static class SeedData
{
    public const string DemoPassword = "Demo123!";

    // Wipes all demo content and seeds it again. Users are kept, so their ids stay the same
    // and anyone who is signed in stays signed in as the same person.
    public static async Task ResetAsync(AppDb db)
    {
        await db.Database.ExecuteSqlRawAsync(
            "TRUNCATE comments, task_items, project_members, projects RESTART IDENTITY");
        await RunAsync(db);
    }

    public static async Task RunAsync(AppDb db)
    {
        if (await db.Projects.AnyAsync()) return; //already seeded

        var hasher = new PasswordHasher<User>();
        var existing = await db.Users.ToDictionaryAsync(u => u.Email);
        User NewUser(string name, string email)
        {
            if (existing.TryGetValue(email, out var found)) return found;
            var u = new User {Name = name, Email = email};
            u.PasswordHash = hasher.HashPassword(u, DemoPassword);

            return u;
        }

        var maya = NewUser("Maya Patel", "maya@taskflow.demo");
        var sam = NewUser("Sam Rivera", "sam@taskflow.demo");
        var riley = NewUser("Riley Chen", "riley@taskflow.demo");

        var web = new Project {Name = "Website Relaunch", Description = "Refresh marketing site before autumn campaign.", Owner = maya};
        web.Members.AddRange([
            new() {User = maya, Role = ProjectRole.manager},
            new() {User = sam, Role = ProjectRole.member},
            new() {User = riley, Role = ProjectRole.member}
        ]);

        var onboarding = new Project {Name = "Customer Onboarding", Description = "Make the first week for customers smoother", Owner = maya};
        onboarding.Members.AddRange([
            new() {User = maya, Role = ProjectRole.manager},
            new() {User = riley, Role = ProjectRole.member}
        ]);


        var now = DateTime.UtcNow;
        TaskItem T(Project p, string title, TaskState s, Priority pr, User? who, int? dueInDays) => new ()
        {
            Project = p, Title = title, Status = s, Priority = pr, Assignee = who, CreatedBy = maya, 
            DueAt = dueInDays is int d ? now.AddDays(d) : null, Description = $"{title} for the {p.Name} project" 
        };

        var homepageCopy = T(web, "Write homepage copy", TaskState.in_progress, Priority.high, sam, 2);
        db.TaskItems.AddRange(
            T(web, "Audit current site content", TaskState.done, Priority.normal, sam, -10),
            T(web, "Draft information architecture", TaskState.done, Priority.high, maya, -5),
            homepageCopy,
            T(web, "Design pricing page", TaskState.in_progress, Priority.normal, riley, 5),
            T(web, "Fix broken links report", TaskState.todo, Priority.low, sam, -3),
            T(web, "Set up analytics events", TaskState.blocked, Priority.normal, riley, -1),
            T(web, "Accessibility review", TaskState.todo, Priority.high, sam, 14),
            T(web, "Migrate blog posts", TaskState.todo, Priority.normal, null, 21),
            T(web, "Launch checklist", TaskState.todo, Priority.high, maya, 30),
            T(onboarding, "Welcome email sequence", TaskState.done, Priority.normal, riley, -7),
            T(onboarding, "Onboarding checklist UI", TaskState.in_progress, Priority.high, riley, 3),
            T(onboarding, "Import customer CSV template", TaskState.todo, Priority.normal, maya, -2),
            T(onboarding, "Help center articles", TaskState.blocked, Priority.low, riley, 10),
            T(onboarding, "Kickoff call script", TaskState.done, Priority.low, maya, -12),
            T(onboarding, "Collect beta feedback", TaskState.todo, Priority.normal, null, null)
        );

        db.Comments.AddRange(
            new Comment { Task = homepageCopy, Author = maya, Body = "Please keep the hero under 12 words."},
            new Comment { Task = homepageCopy, Author = sam, Body = "First draft is in the shared folder."}
        );

        db.Projects.AddRange(web, onboarding);
        await db.SaveChangesAsync();
    }

}