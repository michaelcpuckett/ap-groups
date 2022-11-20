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

  @property({type: Object})
  private members?: AP.Actor[];

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
        ${repeat(this.members, (memberer: AP.Actor) => {
          return html`
            <li>
              <a href=${memberer.id}>
                ${memberer.preferredUsername}
              </a>
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