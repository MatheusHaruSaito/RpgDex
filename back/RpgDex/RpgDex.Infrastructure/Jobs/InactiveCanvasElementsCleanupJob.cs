using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Jobs
{
    public class InactiveCanvasElementsCleanupJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<InactiveCanvasElementsCleanupJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
        private static readonly TimeSpan Retention = TimeSpan.FromDays(30);

        public InactiveCanvasElementsCleanupJob(
            IServiceScopeFactory scopeFactory,
            ILogger<InactiveCanvasElementsCleanupJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(Interval);
            try
            {
                do { await RunAsync(stoppingToken); }
                while (await timer.WaitForNextTickAsync(stoppingToken));
            }
            catch (OperationCanceledException) { }
        }

        private async Task RunAsync(CancellationToken ct)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<MongoDbContext>();

                var cutoff = DateTime.UtcNow - Retention;

                var filter = Builders<CanvasElement>.Filter.And(
                    Builders<CanvasElement>.Filter.Eq(e => e.IsActive, false),
                    Builders<CanvasElement>.Filter.Ne(e => e.DeactivatedAt, null),
                    Builders<CanvasElement>.Filter.Lt(e => e.DeactivatedAt, cutoff));

                var result = await context.CanvasElements.DeleteManyAsync(filter, ct);

                _logger.LogInformation("Inactive canvas elements cleanup: {Count} removed", result.DeletedCount);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error while cleaning up inactive canvas elements");
            }
        }
    }
}
