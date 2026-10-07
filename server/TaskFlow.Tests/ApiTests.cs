using System.Net;
using System.Net.Http.Json;
using TaskFlow.Api;
using TaskFlow.Api.Data;

namespace TaskFlow.Tests;

// Integration tests: real HTTP requests through the whole API into PostgreSQL.
public class ApiTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    const string Maya = "maya@taskflow.demo", Sam = "sam@taskflow.demo";

    static async Task<T> Read<T>(HttpResponseMessage res) => (await res.Content.ReadFromJsonAsync<T>(ApiFactory.Json))!;

    static async Task<ProjectDetailDto> Project(HttpClient c, string name)
    {
        var list = await c.GetFromJsonAsync<List<ProjectSummaryDto>>("/api/projects", ApiFactory.Json);
        return (await c.GetFromJsonAsync<ProjectDetailDto>($"/api/projects/{list!.Single(p => p.Name == name).Id}", ApiFactory.Json))!;
    }

    static int UserId(ProjectDetailDto p, string name) => p.Members.Single(m => m.Name == name).UserId;

    [Fact]
    public async Task Wrong_password_returns_401()
    {
        var res = await api.CreateClient().PostAsJsonAsync("/api/auth/login", new { email = Maya, password = "wrong" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Missing_credentials_return_400()
    {
        var res = await api.CreateClient().PostAsJsonAsync("/api/auth/login", new { email = "", password = "" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Me_requires_login()
    {
        var res = await api.CreateClient().GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Manager_can_assign_a_member()
    {
        var maya = await api.LoginAs(Maya);
        var web = await Project(maya, "Website Relaunch");

        var res = await maya.PostAsJsonAsync($"/api/projects/{web.Id}/tasks",
            new { title = "New task", assigneeId = UserId(web, "Sam Rivera") });

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        Assert.Equal("Sam Rivera", (await Read<TaskDto>(res)).AssigneeName);
    }

    [Fact]
    public async Task Member_cannot_assign_another_user()
    {
        var sam = await api.LoginAs(Sam);
        var web = await Project(sam, "Website Relaunch");
        var tasks = await sam.GetFromJsonAsync<Paged<TaskDto>>(
            $"/api/projects/{web.Id}/tasks?assignee={UserId(web, "Sam Rivera")}", ApiFactory.Json);

        var res = await sam.PatchAsJsonAsync($"/api/tasks/{tasks!.Items[0].Id}", new { assigneeId = UserId(web, "Riley Chen") });

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Non_member_cannot_see_project()
    {
        var onboardingId = (await Project(await api.LoginAs(Maya), "Customer Onboarding")).Id;
        var res = await (await api.LoginAs(Sam)).GetAsync($"/api/projects/{onboardingId}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Assignee_must_belong_to_project()
    {
        var maya = await api.LoginAs(Maya);
        var web = await Project(maya, "Website Relaunch");
        var onboarding = await Project(maya, "Customer Onboarding");

        var res = await maya.PostAsJsonAsync($"/api/projects/{onboarding.Id}/tasks",
            new { title = "Oops", assigneeId = UserId(web, "Sam Rivera") }); // Sam isn't in Onboarding

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Invalid_status_is_rejected_and_valid_status_persists()
    {
        var sam = await api.LoginAs(Sam);
        var web = await Project(sam, "Website Relaunch");
        var tasks = await sam.GetFromJsonAsync<Paged<TaskDto>>(
            $"/api/projects/{web.Id}/tasks?assignee={UserId(web, "Sam Rivera")}&status=todo", ApiFactory.Json);
        var url = $"/api/tasks/{tasks!.Items[0].Id}";

        Assert.Equal(HttpStatusCode.BadRequest, (await sam.PatchAsJsonAsync(url, new { status = "finished" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await sam.PatchAsJsonAsync(url, new { status = "blocked" })).StatusCode);

        var reloaded = await sam.GetFromJsonAsync<TaskDto>(url, ApiFactory.Json); // "refresh the page"
        Assert.Equal(TaskState.blocked, reloaded!.Status);
    }
}

// Own class = own fresh database, so other tests' changes can't shift the counts.
public class DashboardTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData("maya@taskflow.demo", 11, 3, 3, 4)] // both projects
    [InlineData("sam@taskflow.demo", 7, 2, 2, 2)]   // Website Relaunch only
    public async Task Counts_match_seed_data(string email, int open, int dueSoon, int overdue, int completed)
    {
        var client = await api.LoginAs(email);
        var d = await client.GetFromJsonAsync<DashboardDto>("/api/dashboard/summary", ApiFactory.Json);
        Assert.Equal((open, dueSoon, overdue, completed), (d!.Open, d.DueSoon, d.Overdue, d.CompletedThisMonth));
    }
}
