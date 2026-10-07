using TaskFlow.Api;
using TaskFlow.Api.Data;

namespace TaskFlow.Tests;

// Unit tests: the permission rules alone, no database or HTTP.
public class RulesTests
{
    static readonly UpdateTaskRequest StatusOnly = new(null, null, null, TaskState.done, null, null);
    static readonly UpdateTaskRequest Reassign = new(null, null, 42, null, null, null);

    [Fact] public void Manager_can_change_anything() => Assert.True(Rules.CanUpdateTask(ProjectRole.manager, false, Reassign));
    [Fact] public void Member_can_change_status_of_own_task() => Assert.True(Rules.CanUpdateTask(ProjectRole.member, true, StatusOnly));
    [Fact] public void Member_cannot_change_status_of_others_task() => Assert.False(Rules.CanUpdateTask(ProjectRole.member, false, StatusOnly));
    [Fact] public void Member_cannot_reassign_even_own_task() => Assert.False(Rules.CanUpdateTask(ProjectRole.member, true, Reassign));
    [Fact] public void Non_member_cannot_change_anything() => Assert.False(Rules.CanUpdateTask(null, true, StatusOnly));
    [Fact] public void Only_managers_manage() => Assert.False(Rules.CanManage(ProjectRole.member));
}
