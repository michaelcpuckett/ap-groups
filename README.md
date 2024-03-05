# chirp.social / ap-groups

chirp.social was the domain where ap-groups was hosted. It enabled creation and management of Fediverse Group accounts.

The server is no longer running and the database has been deleted, but it could be forked and a new server/database could be spun up.

If you are interested in running a new instance, you can open a new issue and I can probably help.

For reference:

I used DigitalOcean's App Platform to host the Node server. Automatic production builds occurred anytime I pushed to the `digitalocean` git branch.

I also used DigitalOcean to spin up a Mongo database.

I provided the following environment variables inside DigitalOcean's App Platform for production, and these should also be set in a `.gitignore`'d `.env` file for local development:

- `AP_SERVICE_ACCOUNT`
  - Firebase Authentication Service Account
- `AP_FTP_CONFIG`
  - FTP configuration options (for uploaded profile photos)
  - A JSON object, Base64 encoded
  - Keys should be:
    - `user`
    - `password`
    - `host`
    - `path`
- `AP_MONGO_CLIENT_URL`
  - A `mongodb://` or similar URL
- `AP_MONGO_DB_NAME`
  - The name of the MongoDB database
- `AP_PORT`
  - The port to run on (80 in production)
- `NODE_OPTIONS` set to `--experimental_modules`
  - May be necessary depending on the Node version
  - Due to a `jsonld` package dependency

The dependencies on `activitypub-core-*` packages are at this tag:

https://github.com/michaelcpuckett/activity-kit/releases/tag/v0.1.27

Development continued on the supporting `activitypub-core-*` packages, but the `v0.1.27` tag is the last one that works with the code in this repository.

The current `activity-kit` master branch is buggy and basically non-functional but could probably be cleaned up and used with `ap-groups`.
