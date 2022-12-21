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
import { LOCAL_DOMAIN, isType, SERVER_ACTOR_ID, getId } from 'activitypub-core-utilities';
import * as nunjucks from 'nunjucks';
import { AP } from 'activitypub-core-types';
import * as path from 'path';
import { AssertionError } from 'assert';

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
          getIsEntityGetRequest(url: string) {
            if (url.startsWith('/hashtags') || url.startsWith('/hashtag')) {
              return true;
            }
          },
          async handleOutboxSideEffect(this: {
            activity: AP.Activity;
          }) {
            if (isType(this.activity, AP.ActivityTypes.UPDATE)) {

              // This should only happen once, but set up the Hashtags collection.

              const hashtagsCollectionId = `${LOCAL_DOMAIN}/hashtags`;
              const hashtagsCollection = await mongoDbAdapter.findEntityById(new URL(hashtagsCollectionId));

              if (!hashtagsCollection) {
                const collectionToInsert: AP.Collection = {
                  id: new URL(hashtagsCollectionId),
                  url: new URL(hashtagsCollectionId),
                  type: AP.CollectionTypes.COLLECTION,
                  name: 'Hashtags',
                  published: new Date(),
                  totalItems: 0,
                  attributedTo: new URL(SERVER_ACTOR_ID),
                  items: [],
                };

                await mongoDbAdapter.saveEntity(collectionToInsert);
              }

              const activity = this.activity as AP.Update;
              const object = activity.object as AP.Group;
              const objectId = getId(object);
              const hashtags = (object.tag ? Array.isArray(object.tag) ? object.tag : [object.tag] : []) as AP.Link[];

              // Loop over the Group's existing hashtags.

              const prevObject = await mongoDbAdapter.findEntityById(objectId) as AP.Group;

              if (!prevObject) {
                throw new Error('No object.');
              }

              const prevHashtags = (prevObject.tag ? Array.isArray(prevObject.tag) ? prevObject.tag : [prevObject.tag] : []) as AP.Link[];

              for (const prevHashtag of prevHashtags) {
                const matchingTag = hashtags.find(hashtag => hashtag.name === prevHashtag.name);

                // If the hashtag doesn't exist anymore, delete its relationship to the Group.

                if (!matchingTag) {
                  const tagName = prevHashtag.name.split(/^\#/)[1];
                  const hashtagCollectionId = `${LOCAL_DOMAIN}/hashtag/${tagName}`;

                  await mongoDbAdapter.removeItem(new URL(hashtagCollectionId), objectId);

                  // If there are no more items in this hashtag collection, delete it.

                  const prevCollection = await mongoDbAdapter.findEntityById(new URL(hashtagCollectionId)) as AP.Collection;
                  
                  if (!prevCollection) {
                    break; // Error?
                  }
                  
                  const prevItems = prevCollection.items;

                  if (!prevItems || !(Array.isArray(prevItems) && prevItems.length)) {
                    const hashtagCollectionToDelete: AP.Tombstone = {
                      id: new URL(hashtagCollectionId),
                      url: new URL(hashtagCollectionId),
                      type: AP.ExtendedObjectTypes.TOMBSTONE,
                      formerType: AP.CollectionTypes.COLLECTION,
                      deleted: new Date(),
                    };

                    await mongoDbAdapter.saveEntity(hashtagCollectionToDelete);
                    await mongoDbAdapter.removeItem(new URL(hashtagsCollectionId), new URL(hashtagCollectionId));
                  }
                }
              }

              if (!hashtags.length) {
                return;
              }

              // Loop over the updated hashtags.

              for (const hashtag of hashtags) {
                const matchingTag = prevHashtags.find(prevHashtag => prevHashtag.name === hashtag.name);

                if (!matchingTag) {
                  const tagName = hashtag.name.split(/^\#/)[1];
                  const collectionId = `${LOCAL_DOMAIN}/hashtag/${tagName}`;
                  const collection = await mongoDbAdapter.findEntityById(new URL(collectionId));

                  // If this is a new hashtag, create it and add it to the Hashtags collection.

                  if (!collection || isType(collection, AP.ExtendedObjectTypes.TOMBSTONE)) {
                    const collectionToInsert = {
                      id: new URL(collectionId),
                      url: new URL(collectionId),
                      type: AP.CollectionTypes.COLLECTION,
                      name: hashtag.name,
                      published: new Date(),
                      totalItems: 0,
                      items: [],
                    };

                    await mongoDbAdapter.saveEntity(collectionToInsert);
                    await mongoDbAdapter.insertItem(new URL(hashtagsCollectionId), new URL(collectionId));
                  }

                  // Add the Group to the Hashtag collection.

                  await mongoDbAdapter.insertItem(new URL(collectionId), objectId);
                }
              }
            }
            /*
            if (isType(this.activity, AP.ActivityTypes.CREATE)) {
              const isFromBot = getId(this.activity.actor).toString() === SERVER_ACTOR_ID;

              if (!isFromBot) {
                return;
              }

              // This should only happen once, but set up the Users collection.

              const usersCollectionId = `${LOCAL_DOMAIN}/users`;
              const usersCollection = await mongoDbAdapter.findEntityById(new URL(usersCollectionId));

              if (!usersCollection) {
                const collectionToInsert: AP.Collection = {
                  id: new URL(usersCollectionId),
                  url: new URL(usersCollectionId),
                  type: AP.CollectionTypes.COLLECTION,
                  name: 'Users',
                  published: new Date(),
                  totalItems: 0,
                  attributedTo: new URL(SERVER_ACTOR_ID),
                  items: [],
                };

                await mongoDbAdapter.saveEntity(collectionToInsert);
              }

              // Add the Group to the Users collection.
              
              const activity = this.activity as AP.Create;
              const object = activity.object as AP.Group;
              const objectId = getId(object);

              await mongoDbAdapter.insertItem(new URL(usersCollectionId), objectId);
            }

            if (isType(this.activity, AP.ActivityTypes.DELETE)) {
              const activity = this.activity as AP.Delete;

              // If any actor deletes their own account, remove them from the Users collection.

              if (getId(activity.actor).toString() === getId(activity.object).toString()) {
                
                // Remove the Group from the Users collection.

                const usersCollectionId = `${LOCAL_DOMAIN}/users`;                
                const objectId = getId(activity.object);
  
                await mongoDbAdapter.removeItem(new URL(usersCollectionId), objectId);
              }
            }
            */
          },
          getEntityPageProps: async (entity: AP.Entity) => {
            try {
              assertIsGroup(entity);

              const outboxUrl = entity.outbox as URL;
              const followersUrl = entity.followers as URL;

              const [
                outbox,
                followersCount,
              ] = await Promise.all([
                mongoDbAdapter.findEntityById(outboxUrl).catch(() => ({ orderedItems: [] })),
                mongoDbAdapter.findEntityById(followersUrl).then((collection: AP.Collection) => (collection.items as AP.Entity[]).length).catch(() => 0),
              ]);

              return {
                outbox,
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