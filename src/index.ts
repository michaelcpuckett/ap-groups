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