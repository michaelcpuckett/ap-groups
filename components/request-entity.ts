import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('request-entity')
export class RequestEntity extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }

    a {
      color: var(--text-on-dark-background-color);
    }
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';

  @property({ type: Object })
  private entity: AP.Block|null = null;

  @property({ type: Object })
  private actor: AP.Actor|null = null;

  @property({ type: Boolean })
  private isDeleted = false;

  @property({ type: Boolean, reflect: true, attribute: 'accept-action' })
  private acceptAction: boolean = false;

  @property({ type: Boolean, reflect: true, attribute: 'block-action' })
  private blockAction: boolean = false;

  @property({ type: Boolean, reflect: true, attribute: 'unblock-action' })
  private unblockAction: boolean = false;

  override firstUpdated() {
    let entity: AP.Block|null = null;

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
    .then(actor => {
      this.entity = entity;
      this.actor = actor;
    })
    .catch(() => {
      this.isDeleted = true;
    });
  }

  private accept() {

  }

  private block() {

  }

  private unblock() {
    fetch(`${this.actor.outbox}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Undo',
        actor: `${this.actor.id}`,
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

    if (!this.actor) {
      return html`
        Deleted.
      `;
    }
    
    return html`
      <a target="_blank" href=${this.actor.id}>
        @${this.actor.preferredUsername}@${new URL(this.actor.id).hostname}
      </a>
      ${this.acceptAction ? html`
        <button
          type="button"
          class="button"
          @click=${this.accept}>
          Accept
        </button>
      ` : nothing}
      ${this.blockAction ? html`
        <button
          type="button"
          class="button"
          @click=${this.block}>
          Block
        </button>
      ` : nothing}
      ${this.unblockAction ? html`
        <button
          type="button"
          class="button"
          @click=${this.unblock}>
          Block
        </button>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "request-entity": RequestEntity;
  }
}