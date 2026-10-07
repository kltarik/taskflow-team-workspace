using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TaskFlow.Api.Data;

// Test classes share one database name, so they must not run at the same time.
[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace TaskFlow.Tests;

// Starts the real API in memory, pointed at a separate test database.
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    static readonly string Conn = Environment.GetEnvironmentVariable("TEST_DB")
        ?? "Host=localhost;Port=5432;Database=taskflow_test;Username=taskflow;Password=taskflow";

    public static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:Default"] = Conn }));

    // Runs once per test class: drop the test database; the app re-creates and seeds it on startup.
    public async Task InitializeAsync()
    {
        await using var db = new AppDb(new DbContextOptionsBuilder<AppDb>().UseNpgsql(Conn).Options);
        await db.Database.EnsureDeletedAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => DisposeAsync().AsTask();

    // A client that carries the auth cookie, like a logged-in browser.
    public async Task<HttpClient> LoginAs(string email)
    {
        var client = CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new { email, password = SeedData.DemoPassword });
        res.EnsureSuccessStatusCode();
        return client;
    }
}
