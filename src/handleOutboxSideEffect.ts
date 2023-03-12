import { AP } from 'activitypub-core-types';
import { LOCAL_DOMAIN, isType, SERVER_ACTOR_ID, getId, ACCEPT_HEADER, JRD_CONTENT_TYPE, HTML_CONTENT_TYPE, streamToString } from 'activitypub-core-utilities';

export const handleOutboxSideEffect = async function handleOutboxSideEffect (this: {
  activity: AP.Activity;
  adapters: {
    db: {
      findEntityById: Function;
      queryById: Function;
      fetch: Function;
      saveEntity: Function;
      removeItem: Function;
      insertItem: Function;
      db: {
        collection: Function;
      }
    }
  }
}) {
  if (isType(this.activity, AP.ActivityTypes.UPDATE)) {

    // This should only happen once, but set up the Hashtags collection.

    const hashtagsCollectionId = `${LOCAL_DOMAIN}/hashtags`;
    const hashtagsCollection = await this.adapters.db.findEntityById(new URL(hashtagsCollectionId));

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

      await this.adapters.db.saveEntity(collectionToInsert);
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

        const finger = await this.adapters.db.fetch(`https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`, {
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

    const prevObject = await this.adapters.db.findEntityById(objectId) as AP.Group;

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

        await this.adapters.db.removeItem(new URL(hashtagCollectionId), objectId);

        // If there are no more items in this hashtag collection, delete it.

        const prevCollection = await this.adapters.db.findEntityById(new URL(hashtagCollectionId)) as AP.Collection;
        
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

          await this.adapters.db.saveEntity(hashtagCollectionToDelete);
          await this.adapters.db.removeItem(new URL(hashtagsCollectionId), new URL(hashtagCollectionId));
        }
      }
    }

    // Loop over the updated hashtags.

    for (const hashtag of hashtags) {
      const matchingTag = prevHashtags.find(prevHashtag => prevHashtag.name === hashtag.name);

      if (!matchingTag) {
        const tagName = hashtag.name.split(/^\#/)[1];
        const collectionId = `${LOCAL_DOMAIN}/hashtag/${tagName}`;
        const collection = await this.adapters.db.findEntityById(new URL(collectionId));

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

          await this.adapters.db.saveEntity(collectionToInsert);
          await this.adapters.db.insertItem(new URL(hashtagsCollectionId), new URL(collectionId));
        }

        // Add the Group to the Hashtag collection.

        await this.adapters.db.insertItem(new URL(collectionId), objectId);
      }
    }
  }
};