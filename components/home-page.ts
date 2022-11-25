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
      gap: 24px;
    }

    header {
      display: flex;
      width: 100%;
    }

    h1 {
      flex: 1 1 100%;
    }

    button {
      flex: 0 0 max-content;
    }
    
    li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    @media (max-width: 1199px) {
      :host {
        background-color: var(--primary-color);
        color: var(--text-on-primary-color);
        border-radius: 18px;
        padding: 32px;
        margin: 24px;
      }
    }

    @media (min-width: 1200px) {
      :host {
        grid-template-columns: 2.5fr 1fr;
      }

      .container,
      .right-rail {
        display: grid;
        gap: 24px;
        align-content: flex-start;
      }

      .container {
        grid-column: 1 / 2;
      }

      .right-rail {
        grid-column: 2 / 3;
      }

      header,
      section {
        background-color: var(--primary-color);
        color: var(--text-on-primary-color);
        border-radius: 18px;
        padding: 32px;
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

  private deleteGroup() {
    fetch(this.groupActor.outbox, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Delete',
        actor: this.groupActor.id,
        object: this.groupActor.id,
      }),
    })
    .then((res) => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    }).catch((error: unknown) => {
      console.log('error', error);
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
      <div class="container">
        <section
          role="region"
          aria-labelledby="group-details-heading">
          <h2 id="group-details-heading">
            Edit Group Details for @${this.groupActor.preferredUsername}@chirp.social
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
        <section>
          <button type="button" class="button" @click=${this.logOut}>
            Log Out
          </button>
        </section>

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
            <p>No members are blocked.</p>
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
            <p>
              You have no members following the group.
              To get started, go to your personal Mastodon
              account and search for
              <strong>@${this.groupActor.preferredUsername}@chirp.social</strong>
              then follow it.
            </p>
          </members-list>
        </section>
        <section
          role="region"
          aria-labelledby="delete-heading">
          <h2 id="delete-heading">
            Permanent Changes
          </h2>
          <p>
            <button
              @click=${this.deleteGroup}
              type="button"
              class="button button--tag">
              Delete Group
            </button>
          </p>
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