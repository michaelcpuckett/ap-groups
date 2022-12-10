import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';
import {repeat} from 'lit/directives/repeat';
import {unsafeHTML} from 'lit/directives/unsafe-html';

@customElement('post-entity')
export class PostEntity extends LitElement {
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
  private entity: AP.ExtendedObject|null = null;

  @property({ type: Object })
  private attributedTo: AP.Actor|null = null;

  @property({ type: Boolean })
  private isDeleted = false;

  override firstUpdated() {
    fetch(`/proxy?resource=${this.entityId}`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
    .then(res => res.json())
    .then(entity => {
      this.entity = entity;
      this.isDeleted = this.entity.type === AP.ExtendedObjectTypes.TOMBSTONE || (Array.isArray(this.entity.type) && this.entity.type.includes(AP.ExtendedObjectTypes.TOMBSTONE));

      return fetch(`/proxy?resource=${this.entity.attributedTo}`, {
        headers: {
          'Accept': 'application/activity+json'
        }
      })
    })
    .then(res => res.json())
    .then(actor => this.attributedTo = actor)
    .catch(() => {
      this.isDeleted = true;
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
    
    const attachments = this.entity.attachment ? Array.isArray(this.entity.attachment) ? this.entity.attachment : [this.entity.attachment] : [];
    const attachmentHtml = attachments.length ? repeat(attachments, (attachment: AP.ExtendedObject) => {
      return html`
        <img src=${attachment.url} />
      `;
    }) : nothing;

    return html`
      Published by
      ${this.attributedTo ? html`
        <a target="_blank" href=${this.attributedTo.url}>
          @${this.attributedTo.preferredUsername}@${new URL(this.attributedTo.url).hostname}
        </a>
      ` : nothing}
      on
      <a target="_blank" href=${this.entity.url}>
        ${this.entity.published}
      </a>
      <figure>
        ${attachmentHtml}
        ${unsafeHTML(this.entity.content)}
      </figure>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "post-entity": PostEntity;
  }
}