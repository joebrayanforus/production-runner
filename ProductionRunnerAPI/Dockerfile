# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["ProductionRunnerAPI/ProductionRunnerAPI.csproj", "ProductionRunnerAPI/"]
RUN dotnet restore "ProductionRunnerAPI/ProductionRunnerAPI.csproj"
COPY . .
WORKDIR "/src/ProductionRunnerAPI"
RUN dotnet build "ProductionRunnerAPI.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ProductionRunnerAPI.csproj" -c Release -o /app/publish

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ProductionRunnerAPI.dll"]
