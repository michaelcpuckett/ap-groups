import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import {repeat} from 'lit/directives/repeat';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('member-requests')
export class MemberRequests extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
      padding: 1em;
      border: 1px solid;
      border-radius: 4px;
    }
  `];

  @property({type: String, attribute: 'outbox-url'})
  private outboxUrl?: string;

  @property({type: String, attribute: 'group-actor-id'})
  private groupActorId?: string;

  @property({type: Object})
  private requests?: AP.Actor[];

  private handleAccept(requesterId: string) {
    fetch(this.outboxUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Follow',
        actor: this.groupActorId,
        object: requesterId,
      }),
    }).then((res) => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    });
  }

  render() {
    if (!this.requests) {
      return html`
        Error.
      `;
    }

    if (!this.requests.length) {
      return html`
        No requests.
      `;
    }

    return html`
      <div role="table">
        ${repeat(this.requests, (requester: AP.Actor) => {
          return html`
            <div role="row">
              <div role="cell">
                <a href=${requester.id}>
                  ${requester.preferredUsername}
                </a>
              </div>
              <div role="cell">
                <button
                  @click=${() => this.handleAccept(requester.id)}
                  class="button"
                  type="button">
                  Accept
                </button>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "member-requests": MemberRequests;
  }
}