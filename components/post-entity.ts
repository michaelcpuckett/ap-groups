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

    :host(:not([is-deleted])) {
      display: grid;
      gap: 8px;
    }

    @media (min-width: 600px) {
      :host(:not([is-deleted])) {
        grid-template-columns: 200px minmax(0, 1fr);
      }
    }

    .left-rail {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .attachment {
      border-radius: 8px;
      overflow: hidden;
    }
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';

  @property({ type: Object })
  private entity: AP.ExtendedObject|null = null;

  @property({ type: Object })
  private attributedTo: AP.Actor|null = null;

  @property({ type: Boolean, reflect: true, attribute: 'is-deleted' })
  private isDeleted = false;

  override firstUpdated() {
    const url = new URL(this.entityId);
    const isLocal = url.host === window.location.host;

    fetch(isLocal ? this.entityId : `/proxy?resource=${this.entityId}`, {
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
        <slot>Deleted.</slot>
      `;
    }
    
    if (!this.entity || !this.attributedTo) {
      return html`
        Loading...
      `;
    }
    
    const attachments = this.entity.attachment ? Array.isArray(this.entity.attachment) ? this.entity.attachment : [this.entity.attachment] : [];
    const attachmentHtml = attachments.length ? repeat(attachments, (attachment: AP.ExtendedObject) => {
      return html`
        <img class="attachment" src=${attachment.url} />
      `;
    }) : nothing;

    return html`
      <div class="left-rail">
        ${this.attributedTo ? html`
          <a class="actor-lockup" target="_blank" href=${this.attributedTo.url}>
            ${this.attributedTo.icon ? html`
              <img
                class="avatar avatar--small"
                src=${this.attributedTo.icon?.url ?? this.attributedTo.icon}
                height="70"
                width="70"
              />
            ` : html`
              <span class="avatar avatar--small"></span>
            `}
            <span class="actor-username">
              @${this.attributedTo.preferredUsername}
            </span>
            <span class="actor-hostname">
              ${new URL(`${this.attributedTo.url}`).hostname}
            </span>
          </a>
          <a
            class="permalink"
            target="_blank"
            href=${this.entityId}>
            Permalink
          </a>
        ` : nothing}
      </div>
      <div class="main">
        ${attachmentHtml}
        ${unsafeHTML(this.entity.content)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "post-entity": PostEntity;
  }
}