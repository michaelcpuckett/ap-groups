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

  @property({type: Array, attribute: 'request-ids'})
  private requestIds?: string[];

  @property({type: String, attribute: 'primary-action'})
  private primaryAction: string;

  @property({type: String, attribute: 'secondary-action'})
  private secondaryAction: string;

  @state()
  private requests: Array<{
    originalActivity: AP.Activity;
    actor: AP.Actor;
  }> = [];

  async firstUpdated() {
    this.requests = await Promise.all(
      this.requestIds.map(async id => await fetch(`/proxy?resource=${id}`, {
        headers: {
          'Accept': 'application/activity+json'
        }
      })
      .then(res => res.json())
      .then(async (activity: AP.Activity) => ({
        originalActivity: activity,
        actor: await fetch(`/proxy?resource=${activity.actor}`, {
          headers: {
            'Accept': 'application/activity+json'
          }
        }).then(res => res.json()) as AP.Actor,
      }))));
  }

  private handlePrimaryButtonClick(memberId: string, activityId: string) {
    this.dispatchEvent(new CustomEvent('requests-list:primary-button-click', {
      detail: {
        memberId,
        activityId,
      }
    }));
  }


  private handleSecondaryButtonClick(memberId: string, activityId: string) {
    this.dispatchEvent(new CustomEvent('requests-list:secondary-button-click', {
      detail: {
        memberId,
        activityId,
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
                  @click=${() => this.handlePrimaryButtonClick(`${request.actor.id}`, `${request.originalActivity.id}`)}
                  type="button"
                  class="button button--tag">
                  ${this.primaryAction}
                </button>
              ` : nothing}
              ${this.secondaryAction ? html`
                <button
                  @click=${() => this.handleSecondaryButtonClick(`${request.actor.id}`, `${request.originalActivity.id}`)}
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