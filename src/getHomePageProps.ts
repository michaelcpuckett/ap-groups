import { AP } from 'activitypub-core-types';
import { LOCAL_DOMAIN, getId } from 'activitypub-core-utilities';
import { assertExists, assertIsApActor, assertIsApExtendedObject, assertIsApType } from 'activitypub-core-types';

export const getHomePageProps = async function getHomePageProps (this: {
  adapters: {
    db: {
      findEntityById: Function;
      queryById: Function;
      db: {
        collection: Function;
      }
    }
  }
}, actor: AP.Actor, rawUrl: string) {
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
      this.adapters.db
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

          return {
            sharedTotalItems,
            shared: await Promise.all(sliced.map(async (sharedId: URL): Promise<JSON> => {
              try {
                const announcedActivity = await this.adapters.db.findEntityById(sharedId);

                assertIsApType<AP.Announce>(announcedActivity, AP.ActivityTypes.ANNOUNCE);

                const objectId = getId(announcedActivity.object);

                const object = await this.adapters.db.findEntityById(objectId);

                assertIsApExtendedObject(object);

                const actorId = getId(object.attributedTo);

                const attributedTo = await this.adapters.db.queryById(actorId);

                assertIsApActor(attributedTo);

                return JSON.parse(JSON.stringify({
                  ...announcedActivity,
                  id: `${announcedActivity.id}`,
                  url: `${announcedActivity.url}`,
                  object: {
                    ...object,
                    id: `${object.id}`,
                    url: `${object.url}`,
                    attributedTo: {
                      ...attributedTo,
                      id: `${attributedTo.id}`,
                      url: `${attributedTo.url}`,
                    }
                  },
                }));
              } catch (error) {
                return JSON.parse(JSON.stringify({
                  id: `${sharedId}`,
                  type: AP.ExtendedObjectTypes.TOMBSTONE,
                }));
              }
            })),
          };
        })
        .catch(() => {
          return {
            sharedTotalItems: 0,
            shared: [],
          };
        }),

      this.adapters.db
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
              const foundItem = await this.adapters.db.queryById(item);

              assertIsApType<AP.Follow>(foundItem, AP.ActivityTypes.FOLLOW);

              const actorId = getId(foundItem.actor);

              assertExists(actorId);

              const foundActor = await this.adapters.db.queryById(actorId);

              assertIsApActor(foundActor);

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

      this.adapters.db
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
              return await this.adapters.db.queryById(item);
            })),
          };
        })
        .catch(() => ({
          membersTotalItems: 0,
          members: []
        })),

      this.adapters.db
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

          const sliced = (items ? Array.isArray(items) ? items : [items] : []).slice(startIndex, startIndex + ITEMS_PER_PAGE);

          const blocks = await Promise.all(sliced.map(async (item) => {
            try {
              const foundItem = await this.adapters.db.queryById(item) as AP.Block;

              if (!foundItem) {
                throw new Error('Not found.');
              }

              const actorId = getId(foundItem.object);

              if (!actorId) {
                throw new Error('No actor ID');
              }

              const foundActor = await this.adapters.db.queryById(actorId);

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

      this.adapters.db
        .db
        .collection('username').find({
          value: actor.preferredUsername,
        })
        .toArray()
        .then(async (itemIds) => {
          const managers = await Promise.all(itemIds.map(async ({ _id }) => {
            return (await this.adapters.db.db.collection('account').findOne({
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
      url: url.pathname,
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
};