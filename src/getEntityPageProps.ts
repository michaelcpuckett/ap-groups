import { AP } from 'activitypub-core-types';
import { getId } from 'activitypub-core-utilities';
import { assertIsApType } from 'activitypub-core-types';

function assertIsGroup(entity: AP.Entity): asserts entity is AP.Group {
  if (entity.type !== AP.ActorTypes.GROUP) {
    throw new Error('Entity is not a Group.');
  }
}

export const getEntityPageProps = async function getEntityPageProps (this: {
  adapters: {
    db: {
      findEntityById: Function;
      queryById: Function;
      fetchEntityById: Function;
      db: {
        collection: Function;
      }
    }
  }
}, entity: AP.Entity) {
  if (entity.type === 'OrderedCollectionPage' && entity.name === 'Shared' && 'orderedItems' in entity) {
    const orderedItemIds = entity.orderedItems ? Array.isArray(entity.orderedItems) ? entity.orderedItems : [entity.orderedItems] : [];

    const orderedItems = await Promise.all(orderedItemIds.map(async (item: AP.EntityReference) => {
      assertIsApType<AP.Announce>(item, AP.ActivityTypes.ANNOUNCE);

      const objectId = getId(item.object);

      if (!objectId || !(objectId instanceof URL)) {
        return {
          ...item,
          object: {
            id: objectId,
            type: AP.ExtendedObjectTypes.TOMBSTONE,
          },
        };
      }

      const object = await this.adapters.db.fetchEntityById(objectId) as AP.Note;

      if (!object) {
        return {
          ...item,
          object: {
            id: `${objectId}`,
            type: AP.ExtendedObjectTypes.TOMBSTONE,
          },
        };
      }

      if (object.attributedTo instanceof URL) {
        const attributedTo = await this.adapters.db.fetchEntityById(object.attributedTo);
        
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
      const attributedTo = await this.adapters.db.findEntityById(entity.attributedTo);

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
      this.adapters.db.findEntityById(outboxUrl).catch(() => ({ orderedItems: [] })),
      this.adapters.db.findEntityById(followersUrl).then((collection: AP.Collection) => (collection.items as AP.Entity[]).length).catch(() => 0),
    ]);

    return {
      outbox,
      followersCount,
    };
  } catch (error) {
    return null;
  }
};