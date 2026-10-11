using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure
{
    public static class IdentityDataSeeder
    {
        public static async Task SeedRoleAsync(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

            string[] roleNames = { "Admin", "User" };
            foreach (var roleName in roleNames)
            {
                if(!await roleManager.RoleExistsAsync(roleName)){
                    await roleManager.CreateAsync(new ApplicationRole(roleName));
                }
            }
        }
    }
}
