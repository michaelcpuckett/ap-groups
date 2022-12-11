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
      color: var(--text-on-light-background-color);
    }
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';

  @property({ type: Object })
  private entity: AP.Activity|null = null;

  @property({ type: Object })
  private actor: AP.Actor|null = null;

  @property({ type: Boolean })
  private isDeleted = false;

  @property({ type: Boolean, reflect: true, attribute: 'accept-action' })
  private acceptAction: boolean = false;

  @property({ type: Boolean, reflect: true, attribute: 'block-action' })
  private blockAction: boolean = false;

  override firstUpdated() {
    let entity: AP.Activity|null = null;

    fetch(`/proxy?resource=${this.entityId}`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
    .then(res => res.json())
    .then(entity => {
      if (!entity) {
        throw new Error('Not found.');
      }

      return fetch(`/proxy?resource=${this.entity.actor}`, {
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "request-entity": RequestEntity;
  }
}