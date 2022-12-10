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
import { LOCAL_DOMAIN } from 'activitypub-core-utilities';
import * as nunjucks from 'nunjucks';
import { AP } from 'activitypub-core-types';
import * as path from 'path';

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

const renderEntityPage = async ({ entity, actor }: { entity: AP.Entity, actor?: AP.Actor }): Promise<string> => {
  return nunjucks.render('entity.html', { entity, actor });
};

const renderDirectoryPage = async ({ groups }: { groups: AP.Group[] }): Promise<string> => {
  return nunjucks.render('directory.html', { groups });
};

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
              mongoDbAdapter.findEntityById(sharedUrl).then((collection: AP.OrderedCollection) => collection.orderedItems),
              mongoDbAdapter.findEntityById(requestsUrl).then((collection: AP.Collection) => collection.items),
              mongoDbAdapter.findEntityById(membersUrl).then((collection: AP.Collection) => collection.items),
              mongoDbAdapter.findEntityById(blocksUrl).then((collection: AP.Collection) => collection.items),
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