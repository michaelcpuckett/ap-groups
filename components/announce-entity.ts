import './post-entity';

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('announce-entity')
export class AnnounceEntity extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }

    a {
      color: var(--text-on-light-background-color);
    }
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';

  @property({ type: Object })
  private entity: AP.Announce | null = null;

  @property({ type: String, reflect: true, attribute: 'actor-id' })
  private actorId = '';

  @property({ type: Boolean })
  private isDeleted = false;

  @property({ type: Boolean, reflect: true, attribute: 'undo-action' })
  private undoAction: boolean = false;

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
        this.isDeleted = true;
      });
  }

  undo() {
    fetch(`${this.actorId}/outbox`, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Undo',
        actor: `${this.actorId}`,
        object: this.entityId,
        to: [
          'https://www.w3.org/ns/activitystreams#Public',
          `${this.actorId}/followers`,
        ],
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
        <slot>Deleted.</slot>
      `;
    }

    if (!this.entity) {
      return html`
        Loading...
      `;
    }

    return html`
      ${this.undoAction ? html`
        <details class="flyout">
          <summary aria-label="Options">
            ...
          </summary>
          <div>
            ${this.undoAction ? html`
              <button
                type="button"
                class="button button--tag"
                @click=${this.undo}>
                Delete
              </button>
            ` : nothing}
          </div>
        </details>
      ` : nothing}
      ${this.entity.context ? html`
        <p class="eyebrow">
          Member Reply
        </p>
        <post-entity entity-id=${this.entity.context}></post-entity>
        <hr />
        <p class="eyebrow">
          In Reference To
        </p>
      ` : nothing}
      <post-entity entity-id=${this.entity.object}>
        <slot>Not found.</slot>
      </post-entity>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "announce-entity": AnnounceEntity;
  }
}