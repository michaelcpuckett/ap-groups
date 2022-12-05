import './post-entity';

import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, state, query} from 'lit/decorators';
import { baseCss } from './base-css';
import {repeat} from 'lit/directives/repeat';
import { AP } from 'activitypub-core-types';

@customElement('group-entity')
export class GroupEntity extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 24px;
    }

    li {
      padding: 1em;
      border-radius: 12px;
      padding: 32px;
      background: var(--light-background-color);
      color: var(--text-on-light-background-color);
    }

    a {
      color: var(--text-on-light-background-color);
    }

    .avatar-summary {
      display: flex;
      grid-auto-flow: column;
      gap: 24px;
      margin-bottom: 24px;
      font-size: 1.25em;
      border-top: 1px solid;
      padding-top: 24px;
      border-bottom: 1px solid;
      padding-bottom: 24px;
      align-items: center;
    }

    .avatar {
      border-radius: 50%;
    }

    h1 {
      text-align: center;
      font-family: 'Passion';
      font-size: 3em;
      text-transform: uppercase;
    }

    h2 {
      margin-bottom: 24px;
    }
  `];

  @property({type: String, attribute: 'entity-name'})
  private entityName?: string;

  @property({type: String, attribute: 'entity-preferred-username'})
  private entityPreferredUsername?: string;

  @property({type: String, attribute: 'entity-summary'})
  private entitySummary?: string;

  @property({type: String, attribute: 'entity-feed-id'})
  private entityFeedId?: string;

  @property({type: String, attribute: 'entity-followers-id'})
  private entityFollowersId?: string;

  @property({type: Object, attribute: 'entity-icon'})
  private entityIcon?: AP.Image;

  @state()
  private feed: AP.Activity[] = [];

  @state()
  private followersCount = -1;

  firstUpdated() {
    fetch(this.entityFeedId, {
      headers: {
        'Accept': 'application/activity+json'
      }
    }).then(res => res.json())
    .then((collection: AP.CollectionTypes.COLLECTION|AP.CollectionTypes.ORDERED_COLLECTION) => {
      this.feed = collection.orderedItems ?? collection.items;
    });

    fetch(this.entityFollowersId, {
      headers: {
        'Accept': 'application/activity+json'
      }
    }).then(res => res.json())
    .then((collection: AP.CollectionTypes.COLLECTION) => {
      this.followersCount = collection.items.length;
    });
  }

  render() {
    return html`
      <h1>
        ${this.entityName}
      </h1>
      <div class="avatar-summary">
        ${this.entityIcon ?
          html`
            <img
              class="avatar"
              height="100"
              width="100"
              src=${this.entityIcon.url}
            />
          ` :
          nothing
        }
        <div>
          <p>
            <strong>
              @${this.entityPreferredUsername}@chirp.social
            </strong>
          </p>
          ${this.entitySummary ? html`
            <p>
              ${this.entitySummary}
            </p>
          ` : nothing}
          ${this.followersCount > -1 ? html`
            <p>
              ${this.followersCount} followers
            </p>
          ` : nothing}
        </div>
      </div>
      <h2>
        Boosted Posts
      </h2>
      <ul>
        ${repeat(this.feed, (item: AP.Activity) => {
          return html`
            <li>
              <post-entity entity-id=${item.object?.id ?? item.object ?? item.id}></post-entity>
            </li>
          `;
        })}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "group-entity": GroupEntity;
  }
}