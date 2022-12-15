import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('follow-activity-entity')
export class FollowActivityEntity extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: inline-flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
    }

    a {
      color: var(--text-on-dark-background-color);
    }
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';

  @property({ type: Object })
  private entity: AP.Activity | null = null;

  @property({ type: String, reflect: true, attribute: 'actor-id' })
  private actorId = '';

  override firstUpdated() {
    fetch(`/proxy?resource=${this.entityId}`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
      .then(res => res.json())
      .then(entity => {
        this.entity = entity;
      })
      .catch(() => {
        this.entity = {
          "error": "Not found."
        } as unknown as AP.Activity;
      });
  }

  private block() {
    fetch(`${this.actorId}/outbox`, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Block',
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
    return html`
      <textarea>${JSON.stringify(this.entity)}</textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "follow-activity-entity": FollowActivityEntity;
  }
}