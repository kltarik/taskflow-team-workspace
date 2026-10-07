using TaskFlow.Api.Data;

namespace TaskFlow.Api;

public static class Rules
{
    public static bool CanManage(ProjectRole? role) => role == ProjectRole.manager;

    public static bool CanUpdateTask(ProjectRole? role, bool isAssignee, UpdateTaskRequest r)
    {
        if(role == ProjectRole.manager) return true;
        var onlyStatus = r is { Title: null, Description: null, AssigneeId: null, 
        Priority: null, DueAt: null};
        return role == ProjectRole.member && isAssignee && onlyStatus;
    }
}