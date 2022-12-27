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
import { LOCAL_DOMAIN, isType, SERVER_ACTOR_ID, getId, ACTIVITYSTREAMS_CONTENT_TYPE, ACCEPT_HEADER, JRD_CONTENT_TYPE, HTML_CONTENT_TYPE, convertUrlsToStrings, parseStream, streamToString } from 'activitypub-core-utilities';
import * as nunjucks from 'nunjucks';
import { AP } from 'activitypub-core-types';
import * as path from 'path';
import { AssertionError } from 'assert';
import * as cookie from 'cookie';

const app = express.default();
app.use(express.static(path.resolve(__dirname, '../static')));

const nunjucksConfig = nunjucks.configure('views', {
  autoescape: true,
});

nunjucksConfig.addFilter('getHostname', (url) => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return '';
  }
});

nunjucksConfig.addFilter('getPathname', (url) => {
  try {
    return new URL(`${LOCAL_DOMAIN}${url}`).pathname;
  } catch (error) {
    return '';
  }
});

nunjucksConfig.addFilter('dateFromNow', (dateString) => {
  const date = new Date(dateString);
  const nowDate = Date.now();
  const rft = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;
  const intervals = [
    { ge: YEAR, divisor: YEAR, unit: 'year' },
    { ge: MONTH, divisor: MONTH, unit: 'month' },
    { ge: WEEK, divisor: WEEK, unit: 'week' },
    { ge: DAY, divisor: DAY, unit: 'day' },
    { ge: HOUR, divisor: HOUR, unit: 'hour' },
    { ge: MINUTE, divisor: MINUTE, unit: 'minute' },
    { ge: 30 * SECOND, divisor: SECOND, unit: 'seconds' },
    { ge: 0, divisor: 1, text: 'just now' },
  ];
  const now = new Date(nowDate).getTime();
  const diff = now - (typeof date === 'object' ? date : new Date(date)).getTime();
  const diffAbs = Math.abs(diff);
  for (const interval of intervals) {
    if (diffAbs >= interval.ge) {
      const x = Math.round(Math.abs(diff) / interval.divisor);
      const isFuture = diff < 0;
      return interval.unit ? rft.format(isFuture ? x : -x, interval.unit as unknown as Intl.RelativeTimeFormatUnit) : interval.text;
    }
  }
})

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
  if (entity.type !== AP.ActorTypes.GROUP) {
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
              const isSensitive = object.sensitive;

              const rawAttachments = (object.attachment ? Array.isArray(object.attachment) ? object.attachment : [object.attachment] : []) as unknown as Array<{
                name: string;
                value: string;
              }>;

              const attachments = [];

              for (const attachment of rawAttachments) {
                if (attachment.name === 'Group Manager' && attachment.value.startsWith('@')) {
                  const [, username, domain] = attachment.value.split('@');

                  const finger = await mongoDbAdapter.fetch(`https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`, {
                    headers: {
                      [ACCEPT_HEADER]: JRD_CONTENT_TYPE,
                    },
                  })
                  .then(res => res.json())
                  .catch(() => null);

                  if (finger && finger.links) {
                    const profileUrl = finger.links.find(({ type }) => type === HTML_CONTENT_TYPE)?.href;

                    if (profileUrl) {
                      attachments.push({
                        ...attachment,
                        value: `<a href="${profileUrl}">@${username}@${domain}</a>`,
                      });
                    } else {
                      attachments.push(attachment);
                    }
                  } else {
                    attachments.push(attachment);
                  }
                } else {
                  attachments.push(attachment);
                }
              }

              ((this.activity as AP.Update).object as AP.Group).attachment = attachments;

              const hashtags = isSensitive ? [] : (object.tag ? Array.isArray(object.tag) ? object.tag : [object.tag] : []) as AP.Link[];

              // Loop over the Group's existing hashtags.

              const prevObject = await mongoDbAdapter.findEntityById(objectId) as AP.Group;

              if (!prevObject) {
                throw new Error('No object.');
              }

              const prevHashtags = isSensitive ? [] : (prevObject.tag ? Array.isArray(prevObject.tag) ? prevObject.tag : [prevObject.tag] : []) as AP.Link[];

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
            if (entity.type === 'OrderedCollectionPage' && entity.name === 'Shared' && 'orderedItems' in entity) {
              const orderedItemIds = entity.orderedItems ? Array.isArray(entity.orderedItems) ? entity.orderedItems : [entity.orderedItems] : [];

              const orderedItems = await Promise.all(orderedItemIds.map(async (item: AP.Announce) => {
                const objectId = getId(item.object);

                if (!objectId || !(objectId instanceof URL)) {
                  return {
                    ...item,
                    object: {
                      type: AP.ExtendedObjectTypes.TOMBSTONE,
                    },
                  };
                }

                const object = await mongoDbAdapter.fetchEntityById(objectId) as AP.Note;

                if (!object) {
                  return {
                    ...item,
                    object: {
                      type: AP.ExtendedObjectTypes.TOMBSTONE,
                    },
                  };
                }

                if (object.attributedTo instanceof URL) {
                  const attributedTo = await mongoDbAdapter.fetchEntityById(object.attributedTo);
                  
                  if (attributedTo) {
                    return {
                      ...item,
                      object: {
                        ...object,
                        attributedTo,
                      },
                    }
                  } else {
                    return {
                      ...item,
                      object: {
                        ...object,
                        attributedTo: {
                          type: AP.ExtendedObjectTypes.TOMBSTONE,
                        },
                      },
                    };
                  }
                } else {
                  return {
                    ...item,
                    object,
                  };
                }
              }));

              if (entity.attributedTo instanceof URL) {
                const attributedTo = await mongoDbAdapter.findEntityById(entity.attributedTo);

                if (!attributedTo) {
                  return {
                    attributedTo: {
                      type: AP.ExtendedObjectTypes.TOMBSTONE,
                    },
                    entity: {
                      ...entity,
                      orderedItems,
                    }
                  }
                }

                return {
                  attributedTo,
                  entity: {
                    ...entity,
                    orderedItems,
                  },
                }
              }

              return {
                attributedTo: {
                  type: AP.ExtendedObjectTypes.TOMBSTONE,
                },
                entity: {
                  ...entity,
                  orderedItems,
                }
              };
            }

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
          getHomePageProps: async (actor: AP.Actor, rawUrl: string) => {
              const ITEMS_PER_PAGE = 50;
              const url = new URL(`${LOCAL_DOMAIN}${rawUrl}`);
              const query = url.searchParams;
              const currentPage = Number(query.get('page') || 1);
              const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

              const streams = actor.streams as URL[];
              const sharedUrl = streams.find((stream: URL) => `${stream}`.endsWith('shared'));
              const requestsUrl = streams.find((stream: URL) => `${stream}`.endsWith('requests'));
              const blocksUrl = streams.find((stream: URL) => `${stream}`.endsWith('blocks'));
              const membersUrl = actor.followers as URL;

              const isPostsPage = url.pathname === '/home/posts';
              const isMembersPage = url.pathname === '/home/members';
              const isManagersPage = url.pathname === '/home/managers';
              const isBlockedPage = url.pathname === '/home/blocked';
              const isRequestsPage = url.pathname === '/home/requests';

              const [
                {
                  sharedTotalItems,
                  shared,
                },
                {
                  requestsTotalItems,
                  requests,
                },
                {
                  membersTotalItems,
                  members,
                },
                {
                  blocksTotalItems,
                  blocks,
                },
                {
                  managersTotalItems,
                  managers,
                },
              ] = await Promise.all([
                mongoDbAdapter
                  .findEntityById(sharedUrl)
                  .then((collection: AP.OrderedCollection) => collection.orderedItems)
                  .then(async (sharedIds: URL[]) => {
                    const sharedTotalItems = sharedIds.length;

                    if (!isPostsPage) {
                      return {
                        sharedTotalItems,
                        shared: sharedIds,
                      };
                    }

                    const sliced = (sharedIds ? Array.isArray(sharedIds) ? sharedIds : [sharedIds] : []).slice(startIndex, startIndex + ITEMS_PER_PAGE);
                    const shared = await Promise.all(sliced.map(async (sharedId) => {
                      try {
                        if (!(sharedId instanceof URL)) {
                          throw new Error('No shared ID');
                        }

                        const announceActivity = await mongoDbAdapter.findEntityById(sharedId) as AP.Announce;
        
                        if (!announceActivity) {
                          throw new Error('No activity found.');
                        }
          
                        const objectId = getId(announceActivity.object);
          
                        if (!objectId) {
                          throw new Error('No object ID');
                        }
          
                        const object = await mongoDbAdapter.fetchEntityById(objectId) as AP.Note;
          
                        if (!object) {
                          throw new Error('No object');
                        }
                        
                        const actorId = getId(object.attributedTo);
          
                        if (!actorId) {
                          throw new Error('No actor ID');
                        }
          
                        const actor = await mongoDbAdapter.fetchEntityById(actorId);
          
                        if (!actor) {
                          throw new Error('No actor.');
                        }
          
                        return {
                          ...announceActivity,
                          object: {
                            ...object,
                            attributedTo: actor,
                          },
                        };
                      } catch (error) {
                        return {
                          type: AP.ExtendedObjectTypes.TOMBSTONE,
                        };
                      }
                    }));

                    return {
                      sharedTotalItems,
                      shared,
                    };
                  })
                  .catch(() => {
                    return {
                      sharedTotalItems: 0,
                      shared: [],
                    };
                  }),

                mongoDbAdapter
                  .findEntityById(requestsUrl)
                  .then((collection: AP.Collection) => collection.items)
                  .then(async (items: URL[]) => {
                    const requestsTotalItems = items.length;

                    if (!isRequestsPage) {
                      return {
                        requestsTotalItems,
                        requests: items,
                      };
                    }

                    const sliced = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                    const requests = await Promise.all(sliced.map(async (item) => {
                      try {
                        const foundItem = await mongoDbAdapter.queryById(item) as AP.Follow;

                        if (!foundItem) {
                          throw new Error('Not found.');
                        }

                        const actorId = getId(foundItem.actor);

                        if (!actorId) {
                          throw new Error('No actor ID');
                        }

                        const foundActor = await mongoDbAdapter.queryById(actorId);

                        if (!foundActor) {
                          throw new Error('No actor found.');
                        }

                        return {
                          ...foundItem,
                          actor: foundActor,
                        };
                      } catch (error) {
                        return {
                          type: AP.ExtendedObjectTypes.TOMBSTONE,
                        };
                      }
                    }));

                    return {
                      requestsTotalItems,
                      requests,
                    };
                  })
                  .catch(() => ({
                    requestsTotalItems: 0,
                    requests: [],
                  })),

                mongoDbAdapter
                  .findEntityById(membersUrl)
                  .then((collection: AP.Collection) => collection.items)
                  .then(async (itemIds: URL[]) => {
                    if (!isMembersPage) {
                      return {
                        membersTotalItems: itemIds.length,
                        members: itemIds,
                      };
                    }

                    const sliced = (itemIds ? Array.isArray(itemIds) ? itemIds : [itemIds] : []).slice(startIndex, startIndex + ITEMS_PER_PAGE);

                    return {
                      membersTotalItems: itemIds.length,
                      members: await Promise.all(sliced.map(async (item) => {
                        return await mongoDbAdapter.queryById(item);
                      })),
                    };
                  })
                  .catch(() => ({
                    membersTotalItems: 0,
                    members: []
                  })),

                mongoDbAdapter
                  .findEntityById(blocksUrl)
                  .then((collection: AP.Collection) => collection.items)
                  .then(async (items: URL[]) => {
                    const blocksTotalItems = items.length;

                    if (!isBlockedPage) {
                      return {
                        blocksTotalItems,
                        blocks: items,
                      }
                    }

                    const blocks = await Promise.all(items.map(async (item) => {
                      try {
                        const foundItem = await mongoDbAdapter.queryById(item) as AP.Block;

                        if (!foundItem) {
                          throw new Error('Not found.');
                        }

                        const actorId = getId(foundItem.object);

                        if (!actorId) {
                          throw new Error('No actor ID');
                        }

                        const foundActor = await mongoDbAdapter.queryById(actorId);

                        if (!foundActor) {
                          throw new Error('No actor found.');
                        }

                        return {
                          ...foundItem,
                          object: foundActor,
                        };
                      } catch (error) {
                        return {
                          type: AP.ExtendedObjectTypes.TOMBSTONE,
                        };
                      }
                    }));
                    
                    return {
                      blocksTotalItems,
                      blocks,
                    };
                  })
                  .catch(() => ({
                    blocksTotalItems: 0,
                    blocks: [],
                  })),

                mongoDbAdapter
                  .db
                  .collection('username').find({
                    value: actor.preferredUsername,
                  })
                  .toArray()
                  .then(async (itemIds) => {
                    const managers = await Promise.all(itemIds.map(async ({ _id }) => {
                      return (await mongoDbAdapter.db.collection('account').findOne({
                        _id,
                      }))?.value;
                    }));
                    
                    const managersTotalItems = managers.length;

                    if (!isManagersPage) {
                      return {
                        managersTotalItems,
                        managers,
                      };
                    }
                    
                    const sliced = managers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
 
                    return {
                      managersTotalItems,
                      managers: sliced,
                    }
                  })
                  .catch(() => ({
                    managersTotalItems: 0,
                    managers: [],
                  })),
              ]);

              const totalItems = isPostsPage ? sharedTotalItems : isMembersPage ? membersTotalItems : isManagersPage ? managersTotalItems : isRequestsPage ? requestsTotalItems : isBlockedPage ? blocksTotalItems : 0;
              const lastPageIndex = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

              return {
                shared,
                requests,
                members,
                blocks,
                managers,
                url: rawUrl,
                pagination: {
                  totalItems,
                  first: `${LOCAL_DOMAIN}${url.pathname}?page=1`,
                  ...currentPage > 1 ? {
                    prev: `${LOCAL_DOMAIN}${url.pathname}?page=${currentPage - 1}`,
                  } : null,
                  ...currentPage < lastPageIndex ? {
                    next: `${LOCAL_DOMAIN}${url.pathname}?page=${currentPage + 1}`,
                  } : null,
                  last: `${LOCAL_DOMAIN}${url.pathname}?page=${lastPageIndex}`,
                }
              };
          },
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