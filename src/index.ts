import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import * as express from 'express';
import { activityPub } from 'activitypub-core-server-express';
import { MongoClient } from 'mongodb';
import { MongoDbAdapter } from 'activitypub-core-db-mongo';
import { FirebaseAuthAdapter } from 'activitypub-core-auth-firebase';
import { FtpStorageAdapter } from 'activitypub-core-storage-ftp';
import { DeliveryAdapter } from 'activitypub-core-delivery';
import { ServiceAccount } from 'firebase-admin';
import { ServerResponse, IncomingMessage } from 'http';
import { getGuid, LOCAL_DOMAIN } from 'activitypub-core-utilities';
import * as nunjucks from 'nunjucks';
import { AP } from 'activitypub-core-types';
import * as path from 'path';
import { AssertionError } from 'assert';
import * as Formidable from 'formidable';
import FormData from 'form-data';
import * as cookie from 'cookie';
import { ClientCredentials, ResourceOwnerPassword, AuthorizationCode } from 'simple-oauth2';

const app = express.default();
app.use(express.static(path.resolve(__dirname, '../static')));

nunjucks.configure('views', {
  autoescape: true,
});

app.get('/', async (req: IncomingMessage, res: ServerResponse) => {
  if (!res.headersSent) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html')
    res.write(nunjucks.render('index.html'));
    res.end();
  }
});

const envServiceAccount = process.env.AP_SERVICE_ACCOUNT;

if (!envServiceAccount) {
  throw new Error('Bad Service Account.');
}

const firebaseServiceAccount: ServiceAccount = JSON.parse(decodeURIComponent(envServiceAccount));

const firebaseAuthAdapter =
  new FirebaseAuthAdapter(
    firebaseServiceAccount,
    'pickpuck-com'
  );

const ftpStorageAdapter =
  new FtpStorageAdapter(
    JSON.parse(decodeURIComponent(process.env.AP_FTP_CONFIG)),
    '/uploads'
  );

const renderLoginPage = async (): Promise<string> => {
  return nunjucks.render('login.html');
};

const renderHomePage = async (homePageProps: {
  actor: AP.Actor;
  shared: AP.Announce[];
  requests: AP.Follow[];
  members: AP.Actor[];
  blocks: AP.Block[];
}): Promise<string> => {
  return nunjucks.render('home.html', homePageProps);
};

const renderEntityPage = async (entityPageProps: { entity: AP.Entity; actor?: AP.Actor; shared: AP.Announce[]; followersCount: number; }): Promise<string> => {
  return nunjucks.render('entity.html', entityPageProps);
};

const renderDirectoryPage = async (directoryPageProps: { currentUrl: string; groups: AP.Group[] }): Promise<string> => {
  return nunjucks.render('directory.html', directoryPageProps);
};

function assertIsGroup(entity: AP.Entity): asserts entity is AP.Group {
  if (entity.type !== 'Group') {
    throw new AssertionError({ message: 'Entity is not a Group.' });
  }
}

(async () => {
  const mongoClient = new MongoClient(process.env.AP_MONGO_CLIENT_URL ?? 'mongodb://127.0.0.1:27017');
  await mongoClient.connect();
  const mongoDb = mongoClient.db(process.env.AP_MONGO_DB_NAME ?? 'groups');

  const mongoDbAdapter =
    new MongoDbAdapter(mongoDb);

  const defaultDeliveryAdapter =
    new DeliveryAdapter({
      adapters: {
        db: mongoDbAdapter,
      },
    });
  
  const OAUTH_CALLBACK_URL = 'https://chirp.social/mastodon-ouath-callback';

  app.get('/mastodon-oauth', async (req, res) => {
    try {
      const cookies = cookie.parse(req.headers.cookie ?? '');
      const userId = await firebaseAuthAdapter.getUserIdByToken(cookies.__session ?? '');
    
      if (!userId) {
        throw new Error('Not authorized.');
      }
    
      const domain = new URL(LOCAL_DOMAIN + req.url).searchParams.get('domain');

      if (!domain) {
        throw new Error('No domain.');
      }

      const callbackUrl = `${OAUTH_CALLBACK_URL}?domain=${domain}`;
      let clientId = await mongoDbAdapter.findStringValueById('client_id', domain);
      let clientSecret = await mongoDbAdapter.findStringValueById('client_secret', domain);

      if (!clientId || !clientSecret) {
        const body = new FormData();
        body.append('client_name', 'chirp.social');
        body.append('redirect_uris', callbackUrl);
        body.append('website', 'https://chirp.social');
    
        mongoDbAdapter.fetch(`https://${domain}/api/v1/apps`, {
          method: 'POST',
          body,
        })
        .then((res: IncomingMessage): Promise<{
          client_id: string;
          client_secret: string;
        }> => {
          const form = Formidable.default();
    
          return new Promise((resolve, reject) => {
            form.parse(res, (err, fields) => {
              if (err) {
                reject(err);
                return;
              }
    
              resolve(fields as {
                client_id: string;
                client_secret: string;
              });
            });
          });
        })
        .then(async({
          client_id,
          client_secret,
        }) => {
          await mongoDbAdapter.saveString('client_id', domain, client_id);
          await mongoDbAdapter.saveString('client_secret', domain, client_secret);

          clientId = client_id;
          clientSecret = client_secret;
        });
      }

      if (!clientId || !clientSecret) {
        console.log({
          clientId,
          clientSecret,
        });
        throw new Error('No client_id/secret');
      }

      const config = {
        client: {
          id: clientId,
          secret: clientSecret,
        },
        auth: {
          tokenHost: `https://${domain}`
        }
      };
      
      const client = new AuthorizationCode(config);

      const authorizationUri = client.authorizeURL({
        redirect_uri: callbackUrl,
        scope: 'read',
        response_type: 'code',
      });

      res.redirect(authorizationUri);
    } catch (error) {
      console.log(error);
      res.write(error.toString());
      res.statusCode = 500;
      res.end();
    }
  });

  app.get('/mastodon-ouath-callback', async (req, res) => {
    const { code, domain } = req.query;
    const callbackUrl = `${OAUTH_CALLBACK_URL}?domain=${domain}`;

    const tokenParams = {
      code: `${code}`,
      redirect_uri: callbackUrl,
      scope: 'read',
    };

    let clientId = await mongoDbAdapter.findStringValueById('client_id', `${domain}`);
    let clientSecret = await mongoDbAdapter.findStringValueById('client_secret', `${domain}`);

    const config = {
      client: {
        id: clientId,
        secret: clientSecret,
      },
      auth: {
        tokenHost: `https://${domain}`,
      }
    };
    
    const client = new AuthorizationCode(config);

    try {
      const accessToken = await client.getToken(tokenParams);

      if (!accessToken.token) {
        throw new Error('No token');
      }

      const user = await mongoDbAdapter.fetch(`https://${domain}/api/v1/accounts/verify_credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
        },
      });

      if (!user) {
        throw new Error('No user found');
      }

      const accountUrl = user.url;

      const cookies = cookie.parse(req.headers.cookie ?? '');

      const userId = await firebaseAuthAdapter.getUserIdByToken(cookies.__session ?? '');
    
      if (!userId) {
        throw new Error('Not authorized.');
      }
    
      await mongoDbAdapter.db.collection('managers').replaceOne(
        {
          _id: userId,
        },
        {
          $push: {
            managers: {
              $each: [accountUrl],
            },
          },
        },
        {
          upsert: true,
        },
      );

      res.redirect('/home');
    } catch (error) {
      console.log('Access Token Error', error.message);
      res.write(error.toString());
      res.statusCode = 500;
      res.end();
    }
  });
    
  app.use(
    activityPub({
      pages: {
        login: renderLoginPage,
        home: renderHomePage,
        entity: renderEntityPage,
        directory: renderDirectoryPage,
      },

      adapters: {
        auth: firebaseAuthAdapter,
        db: mongoDbAdapter,
        delivery: defaultDeliveryAdapter,
        storage: ftpStorageAdapter,
      },
      plugins: [
        {
          generateActorId: () => (preferredUsername: string) => {
            return `${LOCAL_DOMAIN}/@${preferredUsername}`;
          },
          handleCreateUserActor(this: { activity: unknown & { object: AP.Actor } }) {
            return {
              ...this.activity,
              object: {
                ...this.activity.object,
                name: this.activity.object.preferredUsername,
                summary: `I'm a #chirp.social group! Follow me and mention me to join the conversation.`,
                image: {
                  type: 'Image',
                  url: 'https://media.michaelpuckett.engineer/uploads/banner.png',
                },
              }
            };
          },
          getEntityPageProps: async (entity: AP.Entity) => {
            try {
              assertIsGroup(entity);

              const streams = entity.streams as URL[];
              const sharedUrl = streams.find((stream: URL) => `${stream}`.endsWith('shared'));
              const followersUrl = entity.followers as URL;

              const [
                shared,
                followersCount,
              ] = await Promise.all([
                mongoDbAdapter.findEntityById(sharedUrl).then((collection: AP.OrderedCollection) => collection.orderedItems as URL[]).catch(() => []),
                mongoDbAdapter.findEntityById(followersUrl).then((collection: AP.Collection) => (collection.items as AP.Entity[]).length).catch(() => 0),
              ]);

              return {
                shared,
                followersCount,
              };
            } catch (error) {
              return null;
            }
          },
          getHomePageProps: async (actor: AP.Actor) => {
            const streams = actor.streams as URL[];
            const sharedUrl = streams.find((stream: URL) => `${stream}`.endsWith('shared'));
            const requestsUrl = streams.find((stream: URL) => `${stream}`.endsWith('requests'));
            const blocksUrl = streams.find((stream: URL) => `${stream}`.endsWith('blocks'));
            const membersUrl = actor.followers as URL;

            const [
              shared,
              requests,
              members,
              blocks,
            ] = await Promise.all([
              mongoDbAdapter.findEntityById(sharedUrl).then((collection: AP.OrderedCollection) => collection.orderedItems).catch(() => []),
              mongoDbAdapter.findEntityById(requestsUrl).then((collection: AP.Collection) => collection.items).catch(() => []),
              mongoDbAdapter.findEntityById(membersUrl).then((collection: AP.Collection) => collection.items).catch(() => []),
              mongoDbAdapter.findEntityById(blocksUrl).then((collection: AP.Collection) => collection.items).catch(() => []),
            ]);

            return {
              shared,
              requests,
              members,
              blocks,
            };
          },
        }
      ]
    }),
  );

  app.listen(process.env.PORT ?? 3000, () => {
    console.log('Running...');
  });
})();