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
      gap: 32px;
    }

    li {
      padding: 1em;
      border-radius: 32px;
      padding: 32px;
      background: var(--light-background-color);
      color: var(--text-on-light-background-color)
    }

    a {
      color: var(--text-on-light-background-color);
    }

    .avatar-summary {
      display: flex;
      grid-auto-flow: column;
      gap: 12px;
      margin-bottom: 12px;
    }

    .avatar {
      border-radius: 50%;
    }

    h2 {
      margin-bottom: 12px;
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

  @property({type: Object, attribute: 'entity-icon'})
  private entityIcon?: AP.Image;

  @state()
  private feed: AP.ExtendedObject[] = [];

  firstUpdated() {
    fetch(this.entityFeedId, {
      headers: {
        'Accept': 'application/activity+json'
      }
    }).then(res => res.json())
    .then((collection: AP.CollectionTypes.COLLECTION|AP.CollectionTypes.ORDERED_COLLECTION) => {
      this.feed = collection.orderedItems ?? collection.items;
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
            @${this.entityPreferredUsername}@chirp.social
          </p>
          ${this.entitySummary ? html`
            <p>
              ${this.entitySummary}
            </p>
          ` : nothing}
        </div>
      </div>
      <h2>
        Boosted Posts
      </h2>
      <ul>
        ${repeat(this.feed, (item: AP.ExtendedObject) => {
          const attachments = item.attachment ? Array.isArray(item.attachment) ? item.attachment : [item.attachment] : [];

          return html`
            <li>
              ${attachments.length ? repeat(attachments, (attachment: AP.ExtendedObject) => {
                return html`
                  <img src=${attachment.url} />
                `;
              }) : html`
                <p>${item.content}</p>
              `}
              <p>
                By
                <a href=${item.attributedTo}>
                  ${item.attributedTo}
                </a>
              </p>
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