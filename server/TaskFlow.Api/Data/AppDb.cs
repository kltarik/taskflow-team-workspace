using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Data;


public class AppDb(DbContextOptions<AppDb> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<Comment> Comments => Set<Comment>();

    // Keys that encrypt the auth cookie. Stored here so a restart doesn't sign everyone out.
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<User>().Property(u => u.Email).HasMaxLength(200);
        modelBuilder.Entity<User>().Property(u => u.Name).HasMaxLength(100);

        modelBuilder.Entity<Project>().Property(p => p.Name).HasMaxLength(100);
        modelBuilder.Entity<ProjectMember>().HasKey(m => new {m.ProjectId, m.UserId});

        modelBuilder.Entity<TaskItem>().Property(t => t.Title).HasMaxLength(200);
        modelBuilder.Entity<TaskItem>().HasOne(t => t.Assignee).WithMany().HasForeignKey(t => t.AssigneeId);
        modelBuilder.Entity<TaskItem>().HasOne(t => t.CreatedBy).WithMany().HasForeignKey(t => t.CreatedById);
        modelBuilder.Entity<TaskItem>().HasIndex(t => new {t.ProjectId, t.Status});

        foreach(var fk in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;

        modelBuilder.Entity<Comment>().HasOne(c => c.Task).WithMany(t => t.Comments).OnDelete(DeleteBehavior.Cascade);
    }


}