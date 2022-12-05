import './group-details';
import './members-list';
import './requests-list';
import './post-entity';

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

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
  private blockIds?: string[];

  @property({ type: Object })
  private shared?: AP.Announce[];

  @property({ type: Object })
  private requests?: AP.Follow[];

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

        const [
          blocks,
          members,
          requests,
          shared,
        ] = await Promise.all([
          fetch(this.groupActor.streams.find(stream => stream.endsWith('blocks')), {
            headers: {
              'Accept': 'application/activity+json',
            },
          })
            .then(res => res.json())
            .catch(() => null),

          fetch(this.groupActor.followers, {
              headers: {
                'Accept': 'application/activity+json',
              },
            })
            .then(res => res.json())
            .catch(() => null),

          fetch(this.groupActor.streams.find(stream => stream.endsWith('requests')), {
            headers: {
              'Accept': 'application/activity+json',
            },
          })
          .then(res => res.json())
          .catch(() => null),

          fetch(this.groupActor.streams.find(stream => stream.endsWith('shared')), {
            headers: {
              'Accept': 'application/activity+json',
            }
          })
          .then(res => res.json())
          .catch(() => null)
        ]);

        const blockedIds = blocks ? blocks.items.map((item: AP.Block) => `${item.object?.id ?? item.object}`) : [];
        this.blockIds = blocks ? blocks.items.map((item: AP.Block) => `${item.id}`) : [];
        this.requests = requests ? requests.items.filter(({ id }) => !blockedIds.includes(id)) : [];
        this.members = members ? members.items.filter(({ id }) => !blockedIds.includes(id)) : [];
        this.shared = shared.orderedItems ?? [];
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
        to: [
          'https://www.w3.org/ns/activitystreams#Public',
          `${this.groupActor.followers}`,
        ],
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

  private block(memberId: string) {
    fetch(this.groupActor.outbox, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Block',
        actor: this.groupActor.id,
        object: memberId,
      }),
    }).then(res => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    });
  }

  private unblock(blockId: string) {
    fetch(this.groupActor.outbox, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Undo',
        actor: this.groupActor.id,
        object: blockId,
      }),
    }).then(res => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    });
  }

  private accept(memberId: string, followActivityId: string) {
    fetch(this.groupActor.outbox, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Accept',
        actor: this.groupActor.id,
        object: followActivityId,
        to: [
          'https://www.w3.org/ns/activitystreams#Public',
          memberId
        ],
      }),
    }).then(res => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    });
  }

  private undoAnnounce(activityId: string) {
    fetch(this.groupActor.outbox, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Undo',
        actor: this.groupActor.id,
        object: activityId,
        to: [
          'https://www.w3.org/ns/activitystreams#Public',
          `${this.groupActor.followers}`,
        ],
      }),
    }).then(res => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    });
  }

  render() {
    if (!this.groupId) {
      return html`
        Error.
      `;
    }

    if (!this.groupActor) {
      return html`
        Loading...
      `;
    }

    return html`
      <div class="container">
        <section>
          <h1>
            Managing 
            @${this.groupActor.preferredUsername}@chirp.social
          </h1>
        </section>

        <section>
          <details open>
            <summary>
              Edit Profile
            </summary>
            <group-details
              outbox-url=${this.groupActor.outbox}
              upload-media-url=${this.groupActor.endpoints.uploadMedia}
              group-actor-id=${this.groupActor.id}
              ?manually-approves-followers=${this.groupActor.manuallyApprovesFollowers}
              icon=${JSON.stringify(this.groupActor.icon)}
              name=${this.groupActor.name}
              summary=${this.groupActor.summary}>
            </group-details>
          </details>
        </section>

        <section>
          ${this.shared ? html`
            <details open>
              <summary>
                Reposts (${this.shared.length})
              </summary>
              <div class="regions">
                ${this.shared.map(({ id, object }) => html`
                  <div class="region">
                    <post-entity
                      entity-id=${object}>
                    </post-entity>
                    <button
                      @click=${() => this.undoAnnounce(id)}
                      class="button"
                      type="button">
                      Delete Repost
                    </button>
                  </div>
                `)}
              </div>
            </details>
          ` : html`
            Loading...
          `}
        </section>
      </div>

      <div class="right-rail">
        <section>
          <button
            type="button"
            class="button"
            @click=${this.logOut}>
            Log Out
          </button>
        </section>

        <section>
          ${this.requests ? html`
            <details>
              <summary>
                Follower Requests (${this.requests.length})
              </summary>
              <requests-list
                @requests-list:primary-button-click=${({ detail }: CustomEvent) => this.accept(detail.actorId, detail.activityId)}
                @requests-list:secondary-button-click=${({ detail }: CustomEvent) => this.block(detail.actorId)}
                request-ids=${JSON.stringify(this.requests.map(request => request.id))}
                account-reference="actor"
                primary-action="Accept"
                secondary-action="Block">
                <p>No follower requests.</p>
              </requests-list>
            </details>
          ` : html`
            Loading Follower Requests...
          `}
        </section>

        <section>
          ${this.members ? html`
            <details ?open=${!this.members.length}>
              <summary>
                Members (${this.members.length})
              </summary>
              <members-list
                @members-list:primary-button-click=${({ detail }: CustomEvent) => this.block(detail.memberId)}
                members=${JSON.stringify(this.members)}
                primary-action="Block">
                <p>
                  You have no members following the group.
                  To get started, go to your personal Mastodon
                  account and search for
                  <strong>@${this.groupActor.preferredUsername}@chirp.social</strong>
                  then follow it.
                </p>
              </members-list>
            </details>
          ` : html`
            Loading Members...
          `}
        </section>

        <section>
          ${this.blockIds ? html`
            <details>
              <summary>
                Blocked (${this.blockIds.length})
              </summary>
              <requests-list
                @requests-list:primary-button-click=${({ detail }: CustomEvent) => this.unblock(detail.activityId)}
                request-ids=${JSON.stringify(this.blockIds)}
                account-reference="object"
                primary-action="Unblock">
                <p>No one is blocked.</p>
              </requests-list>
            </details>
          ` : html`
            Loading Blocks...
          `}
        </section>

        <section>
          <details>
            <summary>
              Delete Group
            </summary>
            <div>
              <button
                @click=${this.deleteGroup}
                type="button"
                class="button button--tag">
                Delete Group
              </button>
            </div>
          </details>
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