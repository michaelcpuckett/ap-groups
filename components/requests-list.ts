import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
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

  @property({type: String, attribute: 'outbox-url'})
  private outboxUrl?: string;

  @property({type: String, attribute: 'group-actor-id'})
  private groupActorId?: string;

  @property({type: Object})
  private requests?: AP.Follow[];

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
        ${repeat(this.requests, (request: AP.Follow) => {
          return html`
            <li>
              <a href=${request.actor}>${request.actor}</a>
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