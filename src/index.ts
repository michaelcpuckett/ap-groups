import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import * as express from 'express';
import { activityPub } from 'activitypub-core-server-express';
import { MongoClient } from 'mongodb';
import { MongoDbAdapter } from 'activitypub-core-db-mongo';
import { FirebaseAuthAdapter } from 'activitypub-core-auth-firebase';
import { FtpStorageAdapter } from 'activitypub-core-storage-ftp';
import { DeliveryAdapter } from 'activitypub-core-delivery';
import { FoafPlugin } from 'activitypub-core-plugin-foaf';
import { ServiceAccount } from 'firebase-admin';
import { ServerResponse, IncomingMessage } from 'http';
import { LOCAL_DOMAIN } from 'activitypub-core-utilities';
import * as nunjucks from 'nunjucks';
import { AP } from 'activitypub-core-types';

const app = express.default();
app.use(express.static('static/'));

nunjucks.configure('views', {
  autoescape: true,
});

(async () => {
    
  const envServiceAccount = process.env.AP_SERVICE_ACCOUNT;

  if (!envServiceAccount) {
    throw new Error('Bad Service Account.');
  }

  const firebaseServiceAccount: ServiceAccount = JSON.parse(decodeURIComponent(envServiceAccount));

  const mongoClient = new MongoClient(process.env.AP_MONGO_CLIENT_URL ?? 'mongodb://localhost:27017');
  await mongoClient.connect();
  const mongoDb = mongoClient.db(process.env.AP_MONGO_DB_NAME ?? 'groups');

  const firebaseAuthAdapter =
    new FirebaseAuthAdapter(
      firebaseServiceAccount,
      'pickpuck-com'
    );

  const mongoDbAdapter =
    new MongoDbAdapter(mongoDb);

  const defaultDeliveryAdapter =
    new DeliveryAdapter({
      adapters: {
        db: mongoDbAdapter,
      },
    });

  const ftpStorageAdapter =
    new FtpStorageAdapter(
      JSON.parse(decodeURIComponent(process.env.AP_FTP_CONFIG)),
      '/uploads'
    );
  
  const foafPlugin = FoafPlugin(); // TODO: Make callable with `new`.
  
  const renderLoginPage = async (): Promise<string> => {
    return nunjucks.render('login.html');
  };

  const renderHomePage = async ({ actor }: { actor: AP.Actor }): Promise<string> => {
    return nunjucks.render('home.html', { actor });
  };

  const renderEntityPage = async ({ entity, actor }: { entity: AP.Entity, actor?: AP.Actor }): Promise<string> => {
    return nunjucks.render('entity.html', { entity, actor });
  };

  app.use(
    activityPub({
      pages: {
        login: renderLoginPage,
        home: renderHomePage,
        entity: renderEntityPage,
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
        },
      ]
    }),
  );

  app.get('/', async (req: IncomingMessage, res: ServerResponse) => {
    if (!res.headersSent) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html')
      res.write(nunjucks.render('index.html'));
      res.end();
    }
  });

  app.listen(process.env.PORT ?? 3000, () => {
    console.log('Running...');
  });
})();