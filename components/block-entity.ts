import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('block-entity')
export class BlockEntity extends LitElement {
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
  private entity: AP.Block | null = null;

  @property({ type: String, reflect: true, attribute: 'actor-id' })
  private actorId = '';

  @property({ type: Object })
  private object: AP.Actor | null = null;

  @property({ type: Boolean })
  private isDeleted = false;

  @property({ type: Boolean, reflect: true, attribute: 'unblock-action' })
  private unblockAction: boolean = false;

  override firstUpdated() {
    let entity: AP.Block | null = null;

    fetch(`/proxy?resource=${this.entityId}`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
      .then(res => res.json())
      .then(result => {
        if (!result) {
          throw new Error('Not found.');
        }

        entity = result;

        return fetch(`/proxy?resource=${entity.object}`, {
          headers: {
            'Accept': 'application/activity+json'
          }
        });
      })
      .then(res => res.json())
      .then(object => {
        this.entity = entity;
        this.object = object;
      })
      .catch(() => {
        this.isDeleted = true;
      });
  }

  private unblock() {
    fetch(`${this.actorId}/outbox`, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Undo',
        actor: `${this.actorId}`,
        object: this.entity.id,
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

    if (!this.object) {
      return html`
        Deleted.
      `;
    }

    return html`
      <a target="_blank" href=${this.object.id}>
        @${this.object.preferredUsername}@${new URL(this.object.id).hostname}
      </a>
      <details class="flyout">
        <summary aria-label="Options">
          ...
        </summary>
        <div>
          ${this.unblockAction ? html`
            <button
              type="button"
              class="button button--tag"
              @click=${this.unblock}>
              Unblock
            </button>
          ` : nothing}
        </div>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "block-entity": BlockEntity;
  }
}