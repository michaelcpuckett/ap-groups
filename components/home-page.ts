import './group-details';
import './members-list';
import './member-requests';

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

  @property({type: Object})
  private requests?: AP.Actor[];

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

      const followingCollection: AP.Collection = await fetch(this.groupActor.following, {
        headers: {
          'Accept': 'application/activity+json',
        },
      }).then(res => res.json());

      const followersCollection: AP.Collection = await fetch(this.groupActor.followers, {
        headers: {
          'Accept': 'application/activity+json',
        },
      }).then(res => res.json());

      this.members = await Promise.all(followingCollection.items.map(async (item: string) => {
        return await fetch(item, {
          headers: {
            'Accept': 'application/activity+json',
          },
        }).then(res => res.json());
      }));

      this.requests = await Promise.all(followersCollection.items.filter((item: string) => {
        return !followingCollection.items.includes(item);
      }).map(async (item: string) => {
        return await fetch(item, {
          headers: {
            'Accept': 'application/activity+json',
          },
        }).then(res => res.json());
      }));
    });
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
      <h1>Manage Group</h1>
      <section
        role="region"
        aria-labelledby="group-details-heading">
        <h2 id="group-details-heading">
          Edit Group Details
        </h2>
        <group-details
          outbox-url=${this.groupActor.outbox}
          group-actor-id=${this.groupActor.id}
          name=${this.groupActor.name}
          summary=${this.groupActor.summary}>
        </group-details>
      </section>
      <section
        role="region"
        aria-labelledby="manage-members-heading">
        <h2 id="manage-members-heading">
          Manage Members
        </h2>
        <members-list members=${JSON.stringify(this.members)}></members-list>
      </section>
      <section
        role="region"
        aria-labelledby="manage-members-heading">
        <h2 id="manage-members-heading">
          Requests
        </h2>
        <member-requests
          outbox-url=${this.groupActor.outbox}
          group-actor-id=${this.groupActor.id}
          requests=${JSON.stringify(this.requests)}>
        </member-requests>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-page": HomePage;
  }
}