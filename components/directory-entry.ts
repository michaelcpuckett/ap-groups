import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators';
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
    }

    dt {
      font-weight: bold;
    }

    strong {
      display: block;
      font-size: 1.5em;
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

  @state()
  private postsCount = -1;

  @state()
  private followersCount = -1;

  /**
  * @see https://stackoverflow.com/a/67338038/938822
  */
  private fromNow(date: Date, nowDate = Date.now(), rft = new Intl.RelativeTimeFormat('en', { numeric: "auto" })) {
      const SECOND = 1000;
      const MINUTE = 60 * SECOND;
      const HOUR = 60 * MINUTE;
      const DAY = 24 * HOUR;
      const WEEK = 7 * DAY;
      const MONTH = 30 * DAY;
      const YEAR = 365 * DAY;
      const intervals = [
          { ge: YEAR, divisor: YEAR, unit: 'year' },
          { ge: MONTH, divisor: MONTH, unit: 'month' },
          { ge: WEEK, divisor: WEEK, unit: 'week' },
          { ge: DAY, divisor: DAY, unit: 'day' },
          { ge: HOUR, divisor: HOUR, unit: 'hour' },
          { ge: MINUTE, divisor: MINUTE, unit: 'minute' },
          { ge: 30 * SECOND, divisor: SECOND, unit: 'seconds' },
          { ge: 0, divisor: 1, text: 'just now' },
      ];
      const now = new Date(nowDate).getTime();
      const diff = now - (typeof date === 'object' ? date : new Date(date)).getTime();
      const diffAbs = Math.abs(diff);
      for (const interval of intervals) {
          if (diffAbs >= interval.ge) {
              const x = Math.round(Math.abs(diff) / interval.divisor);
              const isFuture = diff < 0;
              return interval.unit ? rft.format(isFuture ? x : -x, interval.unit) : interval.text;
          }
      }
  }

  override firstUpdated() {
    const url = new URL(this.entityId);
    const isLocal = url.hostname === window.location.hostname;

    fetch(isLocal ? this.entityId : `/proxy?resource=${this.entityId}`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
      .then(res => res.json())
      .then(async entity => {
        if (entity.type === 'Tombstone') {
          throw new Error('Deleted');
        }

        this.entity = entity;

        if (!entity.sensitive) {
          const [
            postsCount,
            followersCount,
          ] = await Promise.all([
            fetch(`${entity.outbox}?type=Announce,Create`, {
              headers: {
                'Accept': 'application/activity+json'
              }
            })
            .then(res => res.json())
            .then(result => Number(result.totalItems)),

            fetch(`${entity.followers}`, {
              headers: {
                'Accept': 'application/activity+json'
              }
            })
            .then(res => res.json())
            .then(result => Number(result.totalItems))
          ]);
          
          this.followersCount = followersCount;
          this.postsCount = postsCount;
        }
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
        <section class="region">
          <details>
            <summary>
              Click to View 18+ / Sensitive / NSFW Group
            </summary>
            <p>
              <a href=${this.entity.url}>
                @${this.entity.preferredUsername}@chirp.social
              </a>
            </p>
          </details>
        </section>
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
          <dd style="text-transform: capitalize">
            ${this.fromNow(new Date(this.entity.published))}
          </dd>
          <dt>
            Posts
          </dt>
          <dd>
            ${this.postsCount > -1 ? this.postsCount : '...'}
          </dd>
          <dt>
            Followers
          </dt>
          <dd>
            ${this.followersCount > -1 ? this.followersCount : '...'}
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
