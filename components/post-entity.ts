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
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';

  @property({ type: Number })
  private likesCount: number = -1;

  @property({ type: Number })
  private sharesCount: number = -1;

  @property({ type: Number })
  private repliesCount: number = -1;

  @property({ type: Object })
  private entity: AP.Entity;

  override firstUpdated() {
    fetch(`/proxy?resource=${this.entityId}`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
    .then(res => res.json())
    .then(entity => {
      this.entity = entity;

      fetch(`/proxy?resource=${this.entity.likes}`, {
        headers: {
          'Accept': 'application/activity+json'
        }
      })
      .then(res => res.json())
      .then(likes => {
        this.likesCount = likes.totalItems;
      });
      
      fetch(`/proxy?resource=${this.entity.shares}`, {
        headers: {
          'Accept': 'application/activity+json'
        }
      })
      .then(res => res.json())
      .then(shares => {
        this.sharesCount = shares.totalItems;
      });
      
      fetch(`/proxy?resource=${this.entity.replies}`, {
        headers: {
          'Accept': 'application/activity+json'
        }
      })
      .then(res => res.json())
      .then(replies => {
        this.repliesCount = replies.totalItems;
      });
    })
    .catch(() => {
      this.entity = 'Not found.';
    });
  }

  render() {
    if (!this.entity) {
      return html`Loading...`;
    }

    if (this.entity.type === AP.ExtendedObjectTypes.TOMBSTONE || (Array.isArray(this.entity.type) && this.entity.type.includes(AP.ExtendedObjectTypes.TOMBSTONE))) {
      return html`
        [Deleted]
      `;
    }
    
    const attachments = this.entity.attachment ? Array.isArray(this.entity.attachment) ? this.entity.attachment : [this.entity.attachment] : [];
    const attachmentHtml = attachments.length ? repeat(attachments, (attachment: AP.ExtendedObject) => {
      return html`
        <img src=${attachment.url} />
      `;
    }) : nothing;

    return html`
      Published by <a target="_blank" href=${this.entity.attributedTo}>
        ${this.entity.attributedTo}
      </a>
      on
      <a target="_blank" href=${this.entity.url}>
        ${this.entity.published}
      </a>
      <figure>
        ${attachmentHtml}
        ${unsafeHTML(this.entity.content)}
      </figure>
      <p>
        <a href=${this.entity.likes}>
        ${this.likesCount > -1 ? this.likesCount : '... Loading'} Likes
        </a>
      </p>
      <p>
        <a href=${this.entity.shares}>
        ${this.sharesCount > -1 ? this.sharesCount : '... Loading'} Shares
        </a>
      </p>
      <p>
        <a href=${this.entity.shares}>
          ${this.repliesCount > -1 ? this.repliesCount : '... Loading'} Replies
        </a>
      </p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "post-entity": PostEntity;
  }
}