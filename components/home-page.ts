import './group-details';
import './members-list';

import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('home-page')
export class HomePage extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
      padding: 1em;
    }
  `];

  @property({type: String, reflect: true, attribute: 'group-id'})
  private groupId?: string;

  @property({type: Object})
  private groupActor?: AP.Actor;

  @property({type: Object})
  private members?: AP.Actor[];

  firstUpdated() {
    if (!this.groupId) {
      return;
    }

    fetch(this.groupId, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
    .then(res => res.json())
    .then(async (actor: AP.Actor) => {
      this.groupActor = actor;

      this.members = await fetch(this.groupActor.followers, {
        headers: {
          'Accept': 'application/activity+json',
        },
      }).then(res => res.json()).then(collection => collection.items);
    });
  }

  private logOut() {
    document.cookie = '__session=; Max-Age=0; path=/; domain=' + location.hostname;
    window.location.reload();
  }

  render() {
    if (!this.groupId) {
      return html`
        Error.
      `;
    }

    if (!this.members) {
      return html`
        Loading...
      `;
    }

    return html`
      <button type="button" class="button" @click=${this.logOut}>
        Log Out
      </button>
      <h1>Manage Group</h1>
      <section
        role="region"
        aria-labelledby="group-details-heading">
        <h2 id="group-details-heading">
          Edit Group Details
        </h2>
        <group-details
          outbox-url=${this.groupActor.outbox}
          upload-media-url=${this.groupActor.endpoints.uploadMedia}
          group-actor-id=${this.groupActor.id}
          icon=${JSON.stringify(this.groupActor.icon)}
          name=${this.groupActor.name}
          summary=${this.groupActor.summary}>
        </group-details>
      </section>
      <section
        role="region"
        aria-labelledby="manage-members-heading">
        <h2 id="manage-members-heading">
          Members
        </h2>
        <members-list
          outbox-url=${this.groupActor.outbox}
          group-actor-id=${this.groupActor.id}
          members=${JSON.stringify(this.members)}>
        </members-list>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-page": HomePage;
  }
}