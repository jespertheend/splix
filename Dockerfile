FROM denoland/deno:1.43.6 as build

WORKDIR /app

RUN apt-get update && apt-get install -y unzip

COPY . .

RUN deno task build-gameserver

FROM debian:12-slim

COPY --from=build /app/gameServer/out/linux/ .

EXPOSE 8080

ENTRYPOINT ["./splixGameServer", "--hostname", "0.0.0.0"]
