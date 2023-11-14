# Interval Server

Interval Server is the central node used to run applications developed with the [Interval SDK](https://github.com/interval/interval-node).

**Note:** Previously Interval Server was only available as a closed-source cloud service. Now, it is possible to run an instance yourself. This is a new direction for the Interval project and the fully open-source/self-hosted Interval Server application is still in early phases of development. If you encounter an issues setting up an Interval Server instance, please let us know by opening an issue!

## Pre-requisites

### Required dependencies

Interval Server requires a Postgres database to work. In the future, especially for local development, we may ease this requirement.

We have tested Interval Server with Postgres versions 11.x and 12.x. Newer versions should work, but we do not plan to support anything older than 11.x.

### Optional dependencies

- [Postmark](https://postmarkapp.com) is used for sending application emails. In the future we may introduce a vendor-agnostic path for sending emails. If a `POSTMARK_API_KEY` environment variable is not provided when running Interval server, emails will not be sent.
- [WorkOS](https://workos.com) is used for SSO, directory sync, and Sign in with Google. If `WORKOS_API_KEY`,`WORKOS_CLIENT_ID`, and `WORKOS_WEBHOOK_SECRET` environment variables are not provided when running Interval Server, these functions will not be available.
- [Slack](https://slack.com) can be used to send notifications via Interval's [notify](https://interval.com/docs/action-context/notify) methods. If `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` environment variables are not provided when running Interval Server, notifications cannot be sent via Slack.
- [S3](https://aws.amazon.com/s3/) can be used to support file uploads via Interval's [file input](https://interval.com/docs/io-methods/input-file) methods. If `S3_KEY_ID`,`S3_KEY_SECRET`,`S3_BUCKET`, and `S3_REGION` environment variables are not provided when running Interval Server, file uploads will not function properly.

## Required environment variables

- `APP_URL` is the URL where your Interval Server instance is running. For example: `http://localhost:3000` or `https://example.com`.
- `DATABASE_URL` is the Postgres connection string. It should follow the format `postgresql://username:password@host:port/dbname`.
- `SECRET` is a secret that _you must provide_ for use in encrypting passwords. Any string is valid for this value, but you should use something secure!
- `WSS_API_SECRET` is a secret that _you must provide_. It is used internally by Interval Server for communication between Interval services. Any string is valid for this value, but you should use something secure!
- `AUTH_COOKIE_SECRET` is a secret that _you must provide_ for use in encrypting session cookies. Any string is valid for this value, but you should use something secure!

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

_Note:_ you don't _need_ to use a `.env` file. As long as the [required variables](## Required environment variables) are set, you should be good to go.
