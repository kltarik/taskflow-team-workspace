using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using TaskFlow.Api;
using TaskFlow.Api.Data;

namespace TaskFlow.Tests;

// Own class = own fresh database, because these tests change and reset the data.
public class DemoTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    static readonly WebApplicationFactoryClientOptions NoCookieJar = new() { HandleCookies = false };

    [Fact]
    public async Task Session_survives_an_api_restart()
    {
        var login = await api.CreateClient(NoCookieJar).PostAsJsonAsync("/api/auth/login",
            new { email = "sam@taskflow.demo", password = SeedData.DemoPassword });
        var cookie = login.Headers.GetValues("Set-Cookie").Single().Split(';')[0];

        // The key that encrypted the cookie lives in Postgres. Without this check the test could pass
        // on a dev machine, where .NET also falls back to keys in ~/.aspnet; a container has no such folder.
        using (var scope = api.Services.CreateScope())
            Assert.NotEmpty(scope.ServiceProvider.GetRequiredService<AppDb>().DataProtectionKeys);

        // A second app instance on the same database = the API after a restart.
        // It has no keys in memory, so it can only read the cookie if the keys were persisted.
        await using var restarted = new ApiFactory();
        var client = restarted.CreateClient(NoCookieJar);
        client.DefaultRequestHeaders.Add("Cookie", cookie);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Reset_restores_seed_data_and_keeps_users_signed_in()
    {
        var maya = await api.LoginAs("maya@taskflow.demo");
        await maya.PostAsJsonAsync("/api/projects", new { name = "Visitor project" });
        Assert.Equal(3, (await maya.GetFromJsonAsync<List<ProjectSummaryDto>>("/api/projects", ApiFactory.Json))!.Count);

        using (var scope = api.Services.CreateScope())
            await SeedData.ResetAsync(scope.ServiceProvider.GetRequiredService<AppDb>());

        // Same cookie still works, and the data is back to the seed.
        var projects = await maya.GetFromJsonAsync<List<ProjectSummaryDto>>("/api/projects", ApiFactory.Json);
        Assert.Equal(["Customer Onboarding", "Website Relaunch"], projects!.Select(p => p.Name));
        var d = await maya.GetFromJsonAsync<DashboardDto>("/api/dashboard/summary", ApiFactory.Json);
        Assert.Equal((11, 3, 3, 4), (d!.Open, d.DueSoon, d.Overdue, d.CompletedThisMonth));
    }

    [Fact]
    public async Task Demo_info_is_public_and_reset_is_off_by_default()
    {
        var info = await api.CreateClient().GetFromJsonAsync<DemoInfo>("/api/demo", ApiFactory.Json);
        Assert.Equal(0, info!.ResetMinutes);
        Assert.Null(info.NextResetAt);
    }
}
