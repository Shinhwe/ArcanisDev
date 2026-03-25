public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapGet("/", (IHostEnvironment hostEnvironment) =>
        {
            return TypedResults.Ok(new
            {
                service = "Arcanis API",
                environment = hostEnvironment.EnvironmentName,
                framework = "net10.0",
            });
        });

        endpointRouteBuilder.MapGet("/api/v1/health", () =>
        {
            return TypedResults.Ok(new
            {
                status = "ok",
                utc = DateTime.UtcNow,
            });
        })
        .WithName("GetHealth");

        return endpointRouteBuilder;
    }
}
