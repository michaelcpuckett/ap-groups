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
    }
  `];

  @property({type: Object})
  private members?: AP.Actor[];

  @property({type: String, attribute: 'primary-action'})
  private primaryAction: string;

  @property({type: String, attribute: 'secondary-action'})
  private secondaryAction: string;

  private handlePrimaryButtonClick(memberId: string) {
    this.dispatchEvent(new CustomEvent('members-list:primary-button-click', {
      detail: {
        memberId,
      }
    }));
  }

  private handleSecondaryButtonClick(memberId: string) {
    this.dispatchEvent(new CustomEvent('members-list:secondary-button-click', {
      detail: {
        memberId,
      }
    }));
  }

  render() {
    if (!this.members) {
      return html`
        Error.
      `;
    }

    if (!this.members.length) {
      return html`
        <slot></slot>
      `;
    }

    return html`
      <ul>
        ${repeat(this.members, (member: AP.Actor) => {
          return html`
            <li>
              <a href=${member.id}>
                ${member.preferredUsername}@${new URL(`${member.url}`).hostname}
              </a>
              ${this.primaryAction ? html`
                <button
                  @click=${() => this.handlePrimaryButtonClick(`${member.id}`)}
                  type="button"
                  class="button button--tag">
                  ${this.primaryAction}
                </button>
              ` : nothing}
              ${this.secondaryAction ? html`
                <button
                  @click=${() => this.handleSecondaryButtonClick(`${member.id}`)}
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
    "members-list": MembersList;
  }
}