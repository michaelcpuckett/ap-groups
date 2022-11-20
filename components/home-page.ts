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
  private followingCollection?: AP.Collection;

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

      this.followingCollection = await fetch(this.groupActor.following, {
        headers: {
          'Accept': 'application/activity+json',
        },
      }).then(res => res.json());

      this.members = await Promise.all(this.followingCollection.items.map(async (item: string) => {
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
          group-id=${this.groupId}
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-page": HomePage;
  }
}