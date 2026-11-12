using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RpgDex.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Jobs
{
    public class SubscriptionExpiryJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SubscriptionExpiryJob> _logger;

        public SubscriptionExpiryJob(
            IServiceScopeFactory scopeFactory,
            ILogger<SubscriptionExpiryJob> logger
        )
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected async override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            do
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var subscriptionService = scope.ServiceProvider
                        .GetRequiredService<ISubscriptionService>();

                    await subscriptionService.ExpireOverdueAsync();
                    _logger.LogInformation("SubscriptionExpiryJob executed: {time}", DateTime.UtcNow);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error trying to expire subscriptions.");
                }

                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
            while (!stoppingToken.IsCancellationRequested);

        }
    }
}
