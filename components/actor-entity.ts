import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('actor-entity')
export class ActorEntity extends LitElement {
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
  private entity: AP.Actor | null = null;

  @property({ type: String, reflect: true, attribute: 'actor-id' })
  private actorId = '';

  @property({ type: Boolean })
  private isDeleted = false;

  @property({ type: Boolean, reflect: true, attribute: 'block-action' })
  private blockAction: boolean = false;

  override firstUpdated() {
    const url = new URL(this.entityId);
    const isLocal = url.hostname === window.location.hostname;

    fetch(isLocal ? this.entityId : `/proxy?resource=${this.entityId}`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
      .then(res => res.json())
      .then(entity => {
        this.entity = entity;
      })
      .catch(() => {
        this.isDeleted = true;
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
    if (this.isDeleted) {
      return html`
        Deleted.
      `;
    }

    if (!this.entity) {
      return html`
        Loading...
      `;
    }

    return html`
      <a target="_blank" href=${this.entity.id}>
        @${this.entity.preferredUsername}@${new URL(this.entity.id).hostname}
      </a>
      ${this.actorId ? html`
        <details class="flyout">
          <summary aria-label="Options">
            ...
          </summary>
          <div>
            ${this.blockAction ? html`
              <button
                type="button"
                class="button button--tag"
                @click=${this.block}>
                Block
              </button>
            ` : nothing}
          </div>
        </details>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "actor-entity": ActorEntity;
  }
}