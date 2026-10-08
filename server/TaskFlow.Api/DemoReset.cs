using TaskFlow.Api.Data;

namespace TaskFlow.Api;

public record DemoInfo(int ResetMinutes, DateTime? NextResetAt);

// Public demo protection: every Demo:ResetMinutes, wipe what visitors changed and re-seed.
// 0 (the default) turns it off, which is what local development and the tests use.
public class DemoReset(IServiceScopeFactory scopes, IConfiguration config, ILogger<DemoReset> log) : BackgroundService
{
    public int Minutes { get; } = config.GetValue<int>("Demo:ResetMinutes");
    public DateTime? NextResetAt { get; private set; }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (Minutes <= 0) return;

        var interval = TimeSpan.FromMinutes(Minutes);
        using var timer = new PeriodicTimer(interval);
        NextResetAt = DateTime.UtcNow + interval;

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                await SeedData.ResetAsync(scope.ServiceProvider.GetRequiredService<AppDb>());
                log.LogInformation("Demo data reset");
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Demo data reset failed; will retry at the next interval");
            }
            NextResetAt = DateTime.UtcNow + interval;
        }
    }
}

public static class DemoEndpoints
{
    // Anonymous, so the sign-in page can tell visitors about the reset too.
    public static void MapDemoEndpoints(this RouteGroupBuilder api) =>
        api.MapGet("/demo", (DemoReset demo) => new DemoInfo(demo.Minutes, demo.NextResetAt))
            .AllowAnonymous();
}
