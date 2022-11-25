import './group-details';
import './members-list';

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';
import { getId } from 'activitypub-core-utilities';

@customElement('home-page')
export class HomePage extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: grid;
      padding: 1em;
      gap: 32px;
    }

    @media (min-width: 1200px) {
      :host {
        grid-template-columns: 2.5fr 1fr;
      }

      .container {
        grid-column: 1 / 2;
      }

      .right-rail {
        grid-column: 2 / 3;
      }

      header,
      section {
        background-color: var(--light-background-color);
        color: var(--text-on-light-background-color);
        border-radius: 32px;
      }
    }
  `];

  @property({ type: String, reflect: true, attribute: 'group-id' })
  private groupId?: string;

  @property({ type: Object })
  private groupActor?: AP.Actor;

  @property({ type: Object })
  private members?: AP.Actor[];

  @property({ type: Object })
  private blocked?: AP.Actor[];

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

        this.blocked = await fetch(getId(this.groupActor.streams.find(stream => getId(stream).toString().endsWith('blocked'))).toString(), {
          headers: {
            'Accept': 'application/activity+json',
          },
        })
          .then(res => res.json())
          .then(collection => collection.items)

        const blockedIds = this.blocked.map((item: AP.Actor) => {
          return item.id;
        });

        this.members = await fetch(getId(this.groupActor.followers).toString(), {
          headers: {
            'Accept': 'application/activity+json',
          },
        }).then(res => res.json()).then(collection => collection.items.filter(({
          id
        }) => {
          return !blockedIds.includes(id);
        }));
      });
  }

  private logOut() {
    const cookies = window.document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.slice(0, eqPos) : cookie;
      window.document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }

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
      <div class="container">
        <header>
          <button type="button" class="button" @click=${this.logOut}>
            Log Out
          </button>
          <h1>Manage Group</h1>
        </header>
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
      </div>
      <div class="right-rail">
        <section
          role="region"
          aria-labelledby="manage-members-heading">
          <h2 id="manage-members-heading">
            Blocked
          </h2>
          <members-list
            outbox-url=${this.groupActor.outbox}
            group-actor-id=${this.groupActor.id}
            members=${JSON.stringify(this.blocked)}>
          </members-list>
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
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-page": HomePage;
  }
}