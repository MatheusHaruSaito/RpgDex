using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;
using static System.Net.Mime.MediaTypeNames;

namespace RpgDex.Infrastructure.Jobs
{
    internal class SyncPaymentJob(IServiceScopeFactory scopeFactory,
    ILogger<SyncPaymentJob> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(10);
        private static readonly TimeSpan MinAge = TimeSpan.FromMinutes(5);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {

            using var timer = new PeriodicTimer(Interval);
            do
            {
                try
                {
                    await RunOnceAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break; 
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Payment reconciliation run failed");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }

        private async Task RunOnceAsync(CancellationToken stoppingToken)
        {
            using var scope = scopeFactory.CreateScope();
            var payments = scope.ServiceProvider.GetRequiredService<IPaymentRepository>();
            var service = scope.ServiceProvider.GetRequiredService<IPaymentService>();

            var pending = (await payments.GetPendingAsync(DateTime.UtcNow - MinAge, limit: 100)).ToList();
            logger.LogInformation("Payment reconciliation: {Count} pending payment(s)", pending.Count);

            foreach (var p in pending)
            {
                stoppingToken.ThrowIfCancellationRequested();
                try
                {
                    await service.SyncOrderAsync(p.MpOrderId!);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(ex, "Failed to reconcile payment {Id}", p.Id);
                }
            }
        }
    }
}
