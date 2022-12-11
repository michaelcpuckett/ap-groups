import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('actor-entity')
export class ActorEntity extends LitElement {
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
  private entity: AP.Actor|null = null;

  @property({ type: Boolean })
  private isDeleted = false;

  @property({ type: Boolean, reflect: true, attribute: 'block-action' })
  private blockAction: boolean = false;

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
    
    return html`
      <a target="_blank" href=${this.entity.id}>
        @${this.entity.preferredUsername}@${new URL(this.entity.id).hostname}
      </a>
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
    "actor-entity": ActorEntity;
  }
}