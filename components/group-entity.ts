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
      padding: 1em;
      border: 1px solid;
      border-radius: 4px;
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
      <h1>${this.entityName}</h1>
      <p>@${this.entityPreferredUsername}@chirp.social [Group]</h1>
      ${this.entitySummary ? html`
        <p>${this.entitySummary}</p>
      ` : nothing}
      <h2>Boosted Posts</h2>
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
              <p>— @${item.attributedTo}</p>
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