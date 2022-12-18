import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('directory-entry')
export class DirectoryEntry extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
      width: 100%;

    dt {
      font-weight: bold;
    }
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';

  @property({ type: Boolean, reflect: true, attribute: 'allow-sensitive' })
  private allowSensitive = false;

  @property({ type: Object })
  private entity: AP.Actor | null = null;

  @property({ type: Boolean })
  private isDeleted = false;

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
        if (entity.type === 'Tombstone') {
          throw new Error('Deleted');
        }

        this.entity = entity;
      })
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

    if (this.entity.sensitive && !this.allowSensitive) {
      return html`
        <details>
          <summary>
            18+ / Sensitive / NSFW
          </summary>
          <p>
            <a href=${this.entity.url}>
              @${this.entity.preferredUsername}@chirp.social
            </a>
          </p>
        </details>
      `;
    }

    return html`
      <section class="region">
        ${(this.entity.icon && 'url' in this.entity.icon) ? html`
          <a href=${`${this.entity.outbox}?page=1&current&type=Announce,Create`} style="display: block">
            <img
              class="avatar"
              height="100"
              width="100"
              src=${this.entity.icon?.url}
            />
          </a>
        ` : nothing}
        <a href=${`${this.entity.outbox}?page=1&current&type=Announce,Create`}>
          <strong>
            ${this.entity.name}
          </strong>
        </a>
        <dl>
          <dt>
            Handle
          </dt>
          <dd>
            <a href=${`${this.entity.outbox}?page=1&current&type=Announce,Create`}>
              @${this.entity.preferredUsername}@chirp.social
            </a>
          </dd>
          <dt>
            Bio
          </dt>
          <dd>
            ${this.entity.summary}
          </dd>
          ${Array.isArray(this.entity.attachment) ? repeat(this.entity.attachment, attachment => {
            const propertyValue = attachment as unknown as {
              name: string;
              value: string;
            };
            return html`
              <dt>
                ${propertyValue.name}
              </dt>
              <dd>
                ${propertyValue.value}
              </dd>
            `;
          }) : nothing}
          <dt>
            Added
          </dt>
          <dd>
            ${this.entity.published}
          </dd>
        </dl>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "directory-entry": DirectoryEntry;
  }
}
