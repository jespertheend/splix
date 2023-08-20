# Splix

This monorepo currently only contains the code for hosting a gameserver.
But in the future it might contain client code as well.

# Running locally

1. To download the executable, head over to [releases](https://github.com/jespertheend/splix/releases)
   and download the latest release for your platform.
2. Unarchive the .tar file.
3. You can run `splixGameServer --help` from the command line for an overview of arguments,
   but depending on your platform, you might be able to double click the downloaded file to start the server as well.

If everything went as expected, you should see `Listening on: ws://localhost:8080`.
You can now connect to the server by visiting https://splix.io/#ip=ws://localhost:8080

# Hosting your own public server

Hosting your own server is beyond the scope of this documentation.
There are many different cloud providers, each with their own pros and cons.
The official splix server is hosted on a [DigitalOcean droplet](https://m.do.co/c/33084d0cc2b8).
It uses a nginx proxy in combination with certificates from Let's Encrypt.

As an example, adding the following to your `server` block in your nginx configuration
will forward requests to yourdomain.com/ws to the splix gameserver.

```
location ~* /(ws)$ {
	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
	proxy_http_version 1.1;
	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection "Upgrade";

	proxy_pass http://localhost:8080;
	proxy_read_timeout 90;
}
```

# Running in a development environment

If you want to make changes to the code, you can run the server in a development environment.

1. [Install Deno](https://deno.land/manual@v1.36.1/getting_started/installation)
2. [Clone this repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
3. `cd` into the cloned repository and run `deno task dev`
