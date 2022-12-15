import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('filter-follow-activities')
export class FilterFollowActivities extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: inline-flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
    }

    a {
      color: var(--text-on-dark-background-color);
    }
  `];

  @property({ type: String, reflect: true, attribute: 'actor-id' })
  private actorId = '';

  @property({ type: Array })
  private followers: AP.Actor[] = [];

  @query('slot')
  private slotElement: HTMLSlotElement|null = null;

  override firstUpdated() {
    if (!this.actorId || !this.slotElement) {
      return;
    }

    fetch(`/${this.actorId}/followers`, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
    .then(res => res.json())
    .then(entity => {
      this.followers = entity.items;

      for (const slottedElement of this.slotElement.assignedElements()) {
        slottedElement.setAttribute('follower-ids', JSON.stringify(this.followers));
      }
    })
    .catch(() => {
      this.followers = [];
    });
  }

  render() {
    return html`
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "filter-follow-activities": FilterFollowActivities;
  }
}