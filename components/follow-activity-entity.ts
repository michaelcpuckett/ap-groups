import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('follow-activity-entity')
export class FollowActivityEntity extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
      width: 100%;
    }

    a {
      color: var(--text-on-dark-background-color);
    }
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';

  @property({ type: Object })
  private entity: AP.Follow | null = null;

  @property({ type: String, reflect: true, attribute: 'actor-id' })
  private actorId = '';

  @property({ type: Array, reflect: true, attribute: 'follower-ids' })
  private followerIds: string[] = [];

  override firstUpdated() {
    fetch(`/proxy?resource=${this.entityId}`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
    .then(res => res.json())
    .then(entity => {
      this.entity = entity as AP.Follow;
    })
    .catch(() => {
      this.entity = {
        "error": "Not found."
      } as unknown as AP.Follow;
    });
  }

  private accept() {
    fetch(`${this.actorId}/outbox`, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Acept',
        actor: this.actorId,
        object: this.entityId,
      }),
    }).then(res => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    });
  }

  render() {
    if (!this.entity) {
      return html`
        Loading...
      `;
    }

    if (this.followerIds.includes(`${this.entity?.actor}`) || this.entity.type !== 'Follow') {
      return nothing;
    }

    return html`
      <p>${this.entity.actor}</p>
      ${this.actorId === `${this.entity.object}` ? html`
        <button class="button" type="button" @click=${this.accept}>Accept</button>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "follow-activity-entity": FollowActivityEntity;
  }
}