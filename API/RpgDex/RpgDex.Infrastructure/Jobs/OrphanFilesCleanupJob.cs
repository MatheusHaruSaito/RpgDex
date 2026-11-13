using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Jobs
{
    public class OrphanFilesCleanupJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<OrphanFilesCleanupJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
        private static readonly TimeSpan MinimumAge = TimeSpan.FromHours(24);

        public OrphanFilesCleanupJob(
            IServiceScopeFactory scopeFactory,
            ILogger<OrphanFilesCleanupJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(Interval);

            try
            {
                do
                {
                    await RunAsync(stoppingToken);
                }
                while (await timer.WaitForNextTickAsync(stoppingToken));
            }
            catch (OperationCanceledException)
            {
                // application is shutting down
            }
        }

        private async Task RunAsync(CancellationToken ct)
        {
            try
            {

                using var scope = _scopeFactory.CreateScope();
                var fileRepo = scope.ServiceProvider.GetRequiredService<IFileRepository>();
                var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();

                var providers = scope.ServiceProvider.GetServices<IFileReferenceProvider>();

                var idsInUse = new HashSet<string>();
                foreach (var provider in providers)
                {
                    foreach (var id in await provider.GetReferencedFileIdsAsync(ct))
                    {
                        if (!string.IsNullOrEmpty(id) && ObjectId.TryParse(id, out _))
                            idsInUse.Add(id);
                    }
                }

                var removed = await fileRepo.DeleteOrphanFilesAsync(idsInUse, MinimumAge, ct);

                _logger.LogInformation("Orphan cleanup finished: {Count} files removed", removed);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error while cleaning up orphan files");
            }
        }
    }
}
