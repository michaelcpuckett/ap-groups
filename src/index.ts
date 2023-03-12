import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

import * as express from 'express';
import * as nunjucks from 'nunjucks';
import * as path from 'path';
import * as cookie from 'cookie';
import { ServerResponse, IncomingMessage } from 'http';
import { ServiceAccount } from 'firebase-admin';
import { MongoClient } from 'mongodb';

import { AP } from 'activitypub-core-types';
import { activityPub } from 'activitypub-core-server-express';
import { MongoDbAdapter } from 'activitypub-core-db-mongo';
import { FirebaseAuthAdapter } from 'activitypub-core-auth-firebase';
import { FtpStorageAdapter } from 'activitypub-core-storage-ftp';
import { DeliveryAdapter } from 'activitypub-core-delivery';
import { GroupsPlugin } from 'activitypub-core-plugin-groups';
import { LOCAL_DOMAIN, streamToString } from 'activitypub-core-utilities';

import { getHomePageProps } from './getHomePageProps';
import { getEntityPageProps } from './getEntityPageProps';
import { handleOutboxSideEffect } from './handleOutboxSideEffect';
import { getHostName } from './filters/getHostName';
import { stripDomain } from './filters/stripDomain';
import { dateFromNow } from './filters/dateFromNow';

// Create an immediately-evoked async function in order to wait for MonogDB to spin up.
(async () => {

  // Use Express for all routes.
  const app = express.default();

  // Static files.
  app.use(express.static(path.resolve(__dirname, '../static')));

  // Sets up Nunjucks views.
  const nunjucksConfig = nunjucks.configure('views', {
    autoescape: true,
  });

  // Sets up Nunjucks filters.
  nunjucksConfig.addFilter('getHostname', getHostName);
  nunjucksConfig.addFilter('stripDomain', stripDomain);
  nunjucksConfig.addFilter('dateFromNow', dateFromNow);

  // Handles home get request.
  app.get('/', async (req: IncomingMessage, res: ServerResponse) => {
    if (!res.headersSent) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html')
      res.write(nunjucks.render('index.html'));
      res.end();
    }
  });

  // activitypub-core Plugins.

  // Firebase Authentication adapter plugin.

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

  // FTP Storage adapter plugin.

  const ftpStorageAdapter =
    new FtpStorageAdapter(
      JSON.parse(decodeURIComponent(process.env.AP_FTP_CONFIG)),
      '/uploads'
    );

  // Mongo Database adapter plugin.

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
    
  // Use the activitypub-core Express plugin.

  app.use(
    activityPub({
      pages: {
        login: async (): Promise<string> => {
          return nunjucks.render('login.html');
        },
        home: async (homePageProps: {
          actor: AP.Actor;
          shared: AP.Announce[];
          requests: AP.Follow[];
          members: AP.Actor[];
          blocks: AP.Block[];
        }): Promise<string> => {
          return nunjucks.render('home.html', homePageProps);
        },
        entity: async (entityPageProps: {
          entity: AP.Entity;
          actor?: AP.Actor;
          shared: AP.Announce[];
          followersCount: number;
        }): Promise<string> => {
          return nunjucks.render('entity.html', entityPageProps);
        },
      },

      adapters: {
        auth: firebaseAuthAdapter,
        db: mongoDbAdapter,
        delivery: defaultDeliveryAdapter,
        storage: ftpStorageAdapter,
      },

      plugins: [
        // Uses the AP Groups plugin.
        GroupsPlugin(),

        // Creatse a new "Plugin" with the following methods.
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
                summary: `I'm a chirp.social group! Follow me and mention me to join the conversation.`,
                image: {
                  type: 'Image',
                  url: 'https://media.michaelpuckett.engineer/uploads/banner.png',
                },
              }
            };
          },
          getIsEntityGetRequest(url: string) {
            if ([
              'hashtags',
              'hashtag',
            ].includes(new URL(`${LOCAL_DOMAIN}${url}`).pathname.split('/')[1])) {
              return true;
            }
          },
          handleOutboxSideEffect,
          getEntityPageProps,
          getHomePageProps,
        }
      ]
    }),
  );

  app.post('/user/admin', async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const result = JSON.parse(await streamToString(req));
      const { email } = result;

      if (!email) {
        throw new Error('Bad request: No email.');
      }

      const cookies = cookie.parse(req.headers.cookie ?? '');

      const actor = await mongoDbAdapter.getActorByUserId(
        await firebaseAuthAdapter.getUserIdByToken(cookies.__session ?? ''),
      );

      if (!actor) {
        throw new Error('Bad request: Not authorized.');
      }

      const user = await firebaseAuthAdapter.createUser.call(firebaseAuthAdapter, {
        email,
        preferredUsername: actor.preferredUsername,
      });

      await Promise.all([
        mongoDbAdapter.saveString('account', user.uid, email),
        mongoDbAdapter.saveString('username', user.uid, actor.preferredUsername),
      ]);

      res.statusCode = 200;
      res.write(
        JSON.stringify({
          success: true,
        })
      );
      res.end();
    } catch (error) {
      res.statusCode = 500;
      res.write(JSON.stringify({
        error: `${error || 'Unknown error'}`,
      }));
      res.end();
    }
  });
  
  app.listen(process.env.PORT ?? 3000, () => {
    console.log('Running...');
  });
})();