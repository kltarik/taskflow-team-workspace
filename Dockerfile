# Stage 1: build the Angular app into static files
FROM node:22 AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npx ng build

# Stage 2: compile the API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS server
WORKDIR /src
COPY server/ .
RUN dotnet publish TaskFlow.Api -c Release -o /app

# Stage 3: small runtime image = API + UI in wwwroot (same origin, so no CORS needed)
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=server /app .
COPY --from=client /client/dist/client/browser ./wwwroot
EXPOSE 8080
ENTRYPOINT ["dotnet", "TaskFlow.Api.dll"]
