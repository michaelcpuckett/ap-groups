import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query, state} from 'lit/decorators';
import {repeat} from 'lit/directives/repeat';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('requests-list')
export class RequestsList extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }
  `];

  @property({type: Array})
  private requestIds?: string[];

  @property({type: String, attribute: 'primary-action'})
  private primaryAction: string;

  @property({type: String, attribute: 'secondary-action'})
  private secondaryAction: string;

  @state()
  requests: Array<{
    originalFollow: AP.Follow;
    actor: AP.Actor;
  }> = [];

  async firstUpdated() {
    this.requests = await Promise.all(
      this.requestIds.map(async id => await fetch(id, {
        headers: {
          'Accept': 'application/activity+json'
        }
      })
      .then(res => res.json())
      .then(async follow => ({
        originalFollow: follow,
        actor: await fetch(follow.actor, {
          headers: {
            'Accept': 'application/activity+json'
          }
        }).then(res => res.json())
      }))));
  }

  private handlePrimaryButtonClick(memberId: string, followActivityId: string) {
    this.dispatchEvent(new CustomEvent('request-list:primary-button-click', {
      detail: {
        memberId,
        followActivityId,
      }
    }));
  }


  private handleSecondaryButtonClick(memberId: string, followActivityId: string) {
    this.dispatchEvent(new CustomEvent('request-list:secondary-button-click', {
      detail: {
        memberId,
        followActivityId,
      }
    }));
  }

  render() {
    if (!this.requests) {
      return html`
        Error.
      `;
    }

    if (!this.requests.length) {
      return html`
        <slot></slot>
      `;
    }

    return html`
      <ul>
        ${repeat(this.requests, (request) => {
          return html`
            <li>
              <a href=${request.actor.id}>${request.actor.preferredUsername}</a>
              ${this.primaryAction ? html`
                <button
                  @click=${() => this.handlePrimaryButtonClick(`${request.actor.id}`, `${request.originalFollow.id}`)}
                  type="button"
                  class="button button--tag">
                  ${this.primaryAction}
                </button>
              ` : nothing}
              ${this.secondaryAction ? html`
                <button
                  @click=${() => this.handleSecondaryButtonClick(`${request.actor.id}`, `${request.originalFollow.id}`)}
                  type="button"
                  class="button button--tag">
                  ${this.secondaryAction}
                </button>
              ` : nothing}
            </li>
          `;
        })}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "requests-list": RequestsList;
  }
}