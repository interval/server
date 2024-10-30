# Interval Server
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/tFqAVW?referralCode=chIZYq)

Interval Server is the central node used to run applications developed with the [Interval SDK](https://github.com/interval/interval-node).

**🚧 Note:** Previously Interval Server was only available as a closed-source cloud service. Now, it is possible to run an instance yourself. This is a new direction for the Interval project and the fully open-source/self-hosted Interval Server application is still in early phases of development. If you encounter an issues setting up an Interval Server instance, please let us know by opening an issue!

## Pre-requisites

### Required dependencies

#### Database

Interval Server requires a Postgres database to work. In the future, especially for local development, we may ease this requirement.

We have tested Interval Server with Postgres versions 11.x and 12.x. Newer versions should work, but we do not plan to support anything older than 11.x.

#### Node.js

Interval Server is a pure Node.js application. Node.js version 16 or higher is required to run Interval Server.

### Optional dependencies

- [Postmark](https://postmarkapp.com) is used for sending application emails. In the future we may introduce a vendor-agnostic path for sending emails. If a `POSTMARK_API_KEY` environment variable is not provided when running Interval server, emails will not be sent.
- [WorkOS](https://workos.com) is used for SSO, directory sync, and Sign in with Google. If `WORKOS_API_KEY`,`WORKOS_CLIENT_ID`, and `WORKOS_WEBHOOK_SECRET` environment variables are not provided when running Interval Server, these functions will not be available.
- [Slack](https://slack.com) can be used to send notifications via Interval's [notify](https://interval.com/docs/action-context/notify) methods. If `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` environment variables are not provided when running Interval Server, notifications cannot be sent via Slack.
- [S3](https://aws.amazon.com/s3/) can be used to support file uploads via Interval's [file input](https://interval.com/docs/io-methods/input-file) methods. If `S3_KEY_ID`,`S3_KEY_SECRET`,`S3_BUCKET`, and `S3_REGION` environment variables are not provided when running Interval Server, file uploads will not function properly.

### S3 bucket configuration 

To support file uploads, you will need to configure your S3 bucket for [Cross-origin Resource Sharing](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html).   Here's an example policy:
```
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST",
            "DELETE"
        ],
        "AllowedOrigins": [
            "https://your-interval-server.com"
        ],
        "ExposeHeaders": [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3000
    }
]
``` 

## Required environment variables

- `APP_URL` is the URL where your Interval Server instance is running. For example: `http://localhost:3000` or `https://example.com`.
- `DATABASE_URL` is the Postgres connection string. It should follow the format `postgresql://username:password@host:port/dbname`.
- `SECRET` is a secret that _you must provide_ for use in encrypting passwords. Any string is valid for this value, but you should use something secure!
- `WSS_API_SECRET` is a secret that _you must provide_. It is used internally by Interval Server for communication between Interval services. Any string is valid for this value, but you should use something secure!
- `AUTH_COOKIE_SECRET` is a secret that _you must provide_ for use in encrypting session cookies. Any string **at least 32 characters in length** is valid for this value, but you should use something secure!

### Ports

Interval Server runs services on ports `3000` and `3033`. The main service runs on `3000`.

## Running Interval Server locally

For development, you may wish to run an instance of Interval Server locally.

1. `npm i -g @interval/server`
2. From the directory where you would like to run Interval Server, create a `.env` file like this:

```
DATABASE_URL=<YOUR DATABASE URL>
SECRET=<YOUR SECRET VALUE>
APP_URL=<YOUR APP URL>
AUTH_COOKIE_SECRET=<YOUR AUTH COOKIE SECRET>
WSS_API_SECRET=<YOUR WSS API SECRET>
```

_Note:_ you don't _need_ to use a `.env` file. As long as the [required variables](#required-environment-variables) are set, you should be good to go.

3. If you _have not_ already setup a database, run `interval-server db-init` to initialize one.
4. Run `interval-server start` to run `interval-server`.
5. 🎉 Visit http://localhost:3000 to access your Interval Server!

## Running Interval Server in production

Running Interval Server in production is largely the same as running in development. For convenience, we've created a Docker image to make this even easier.

The Interval Server Docker image is: `docker.io/alexarena/interval-server:latest`.

Many services [like Render](https://render.com/docs/deploy-an-image) make it trivial to deploy Docker images with just a few clicks.

Important things to know:

- You'll still need to provide all [required environment variables](#required-environment-variables) when running the Interval Server Docker image.
- Hosting providers like Render will automatically discover the Interval Server service running on port 3000 and will expose this port for you, but if your hosting provider doesn't do this, you'll have to handle exposing this yourself.

## Connecting to Interval Server from your app

Once your Interval Server instance is up and running, it's trivial to connect to it from your Interval apps. Just add an `endpoint` property pointing to your Interval Server instance to the Interval SDK's constructor. For example:

```js
const interval = new Interval({
  apiKey: process.env.INTERVAL_KEY,
  endpoint: 'wss://<YOUR INTERVAL SERVER URL>/websocket', // Don't forget the /websocket path!
})
```

**Note:** if you're running Interval Server locally, this URL will use the insecure `ws://` protocol, _not_ the secure `wss://` version used in production deployments.

## Available interval-server commands

Once you run `npm i -g @interval/server`, the following commands are available:

### `interval-server start`

Starts Interval Server. See above for information on running Interval Server locally or in production.

### `interval-server db-init`

Creates and sets up an Postgres database for use with Interval Server.

[psql](https://www.postgresql.org/docs/7.0/app-psql.htm) must be installed for this command to work.

You must provide a `DATABASE_URL` environment variable of the form `postgresql://username:password@host:port/dbname` when running this command.

By default, the `db-init` command will attempt to create a database with the name provided in your `DATABASE_URL` environment variable. If you've already created the database and just need to apply create the appropriate tables etc., you can run `interval-server db-init --skip-create` to skip the database creation step.

## Contributing

For our initial release, we're focused on making it easy to setup and run your own Interval Server instance. We'll make it easier to contribute (and document how you can) in the future, but for now we aren't actively soliciting new contributions.
