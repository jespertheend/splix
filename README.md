# Splix

This monorepo currently only contains the code for hosting a gameserver.
But in the future it might contain client code as well.

# Running locally

There are no prebuilt binaries available yet. But you can already run the server in a development environment.

1. [Install Deno](https://deno.land/manual@v1.36.1/getting_started/installation)
2. [Clone this repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
3. `cd` into the cloned repository and run `deno task dev`

If everything went as expected, you should see `Listening on: ws://localhost:8080`.
You can now connect to the server by visiting https://splix.io/#ip=ws://localhost:8080
