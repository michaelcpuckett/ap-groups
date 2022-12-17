import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { repeat } from 'lit/directives/repeat';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('group-entity-details')
export class GroupEntityDetails extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }
    .avatar {
      max-width: 200px;
    }
  `];

  @property({type: String, attribute: 'entity-id'})
  private entityId?: string;

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

    return html`
      <dl role="table">
        <div role="row">
          <dt>
            Avatar
          </dt>
          <dd>
            ${(this.entity.icon && 'url' in this.entity.icon) ? html`
              <a href=${this.entity.url}>
                <img
                  class="avatar"
                  src=${this.entity.icon.url}
                />
              </a>
            ` : nothing}
          </dd>
        </div>
        <div role="row">
          <dt>
            Group Name
          </dt>
          <dd>
            <a href=${this.entity.url}>
              ${this.entity.name}
            </a>
          </dd>
        </div>
        <div role="row">
          <dt>
            18+ / Sensitive / NSFW?
          </span>
          <dd>
            ${this.entity.sensitive ? 'Yes' : 'No'}
          </dd>
        </div>
        <div role="row">
          <dt>
            Group Description
          </span>
          <dd>
            ${this.entity.summary ?? ''}
          </span>
        </div>
        ${Array.isArray(this.entity.attachment) ? repeat(this.entity.attachment, attachment => {
          const propertyValue = attachment as unknown as {
            name: string;
            value: string;
          };

          return html`
            <div role="row">
              <dt>
                ${propertyValue.name}
              </dt>
              <dd>
                ${propertyValue.value}
              </dd>
            </div>
          `;
        }) : nothing}
        <div role="row">
          <dt>
            Manually Approves Members
          </dt>
          <dd>
            ${this.entity.manuallyApprovesFollowers ? 'Yes' : 'No'}
          </dd>
        </div>
      </dl>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "group-entity-details": GroupEntityDetails;
  }
}