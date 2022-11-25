import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import {repeat} from 'lit/directives/repeat';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('members-list')
export class MembersList extends LitElement {
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
  private members?: AP.Actor[];

  private block(memberId: string) {
    fetch(this.outboxUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Block',
        actor: this.groupActorId,
        object: memberId,
      }),
    }).then(res => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    });
  }

  render() {
    if (!this.members) {
      return html`
        Error.
      `;
    }

    if (!this.members.length) {
      return html`
        No members.
      `;
    }

    return html`
      <ul>
        ${repeat(this.members, (member: AP.Actor) => {
          return html`
            <li>
              <a href=${member.id}>
                ${member.preferredUsername}
              </a>
              <button
                @click=${() => this.block(member.id)}
                type="button"
                class="button button--tag">
                Block
              </button>
            </li>
          `;
        })}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "members-list": MembersList;
  }
}