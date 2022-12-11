import './post-entity';

import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
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
  private entity: AP.Announce|null = null;

  @property({ type: Object })
  private object: AP.ExtendedObject|null = null;

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

      return fetch(`/proxy?resource=${this.entity.object}`, {
        headers: {
          'Accept': 'application/activity+json'
        }
      });
    })
    .then(res => res.json())
    .then(actor => {
      this.object = actor;
    })
    .catch(() => {
      this.isDeleted = true;
    });
  }

  undo() {

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
      <post-entity entity-id=${this.object.id}></post-entity>
      ${this.undoAction ? html`
        <button
          type="button"
          class="button"
          @click=${this.undo}>
          Block
        </button>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "announce-entity": AnnounceEntity;
  }
}