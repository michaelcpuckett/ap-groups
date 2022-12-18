import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query, state} from 'lit/decorators';
import { repeat } from 'lit/directives/repeat';
import { AP } from 'activitypub-core-types';
import { baseCss } from './base-css';

@customElement('search-users-form')
export class SearchUsersForm extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }

    a {
      color: var(--text-on-light-background-color);
      display: block;
    }
  `];

  @property({ type: String, reflect: true, attribute: 'entity-id' })
  private entityId = '';
 
  @property({ type: Array })
  private usernames: string[] = [];

  @state()
  private results = [];

  @state()
  private hasFetchedUsernames = false;

  @state()
  private isLoading = false;

  private async fetchUsernames() {
    if (this.hasFetchedUsernames) {
      return;
    }

    this.hasFetchedUsernames = true;

    if (!this.entityId) {
      return;
    }

    await fetch(new URL(this.entityId).pathname, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
      .then(res => res.json())
      .then(async entity => {
        this.usernames = (await Promise.all(entity.orderedItems
          .map(async (activityReference: AP.ActivityReference) => {
            const activity = await fetch(`${activityReference}`, {
              headers: {
                'Accept': 'application/activity+json'
              }
            }).then(res => res.json())
        
            if (activity.type !== 'Create') {
              return null;
            }

            const createActivity = activity as AP.Create;
            const actor = createActivity.object as AP.Actor;
            return actor.preferredUsername;
          })))
          .filter((result: string|null) => typeof result == 'string');
      })
      .catch(() => {
        this.usernames = [];
      });
  }

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault();
  }

  private async handleSearchInput(event: InputEvent) {
    const target = event.currentTarget;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.isLoading = true;
    await this.fetchUsernames();
    this.isLoading = false;
    this.results = this.getResults(target.value.toLowerCase());
  }

  private getResults(value: string) {
    if (!value) {
      return [];
    }

    return this.usernames.filter(username => username.toLowerCase().startsWith(value));
  }

  render() {
    return html`
      <form
        @submit=${this.handleSubmit}
        novalidate>
        <div role="table">
          <label role="row" class="label">
            <span role="columnheader" class="label-text">
              Search Groups by Username
            </span>
            <span role="cell">
              <input
                placeholder="grouphandle"
                @input=${this.handleSearchInput}
                type="search"
              />
              <div role="panel">
                ${this.isLoading ? 'Loading...' : ''}
                ${repeat(this.results.slice(0, 5), (username) => {
                  return html`
                    <a href=${`/@${username}/outbox?page=1&current`}>
                      ${username}
                    </a>
                  `;
                })}
              </div>
            </span>
          </label>
        </div>
        <button type="submit" class="button">
          Send Post
        </button>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "search-users-form": SearchUsersForm;
  }
}