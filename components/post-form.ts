import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { baseCss } from './base-css';

@customElement('post-form')
export class PostForm extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }
  `];

  @query('textarea[name="content"]')
  contentTextareaElement: HTMLTextAreaElement|null;

  @property({type: String, attribute: 'group-actor-id'})
  private groupActorId?: string;

  @property({type: String, attribute: 'outbox-url'})
  private outboxUrl?: string;

  @property({type: String, attribute: 'followers-url'})
  private followersUrl?: string;

  private async handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    if (!this.contentTextareaElement) {
      return;
    }

    const content = this.contentTextareaElement.value;

    if (!content) {
      return;
    }

    fetch(this.outboxUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': [
          'https://www.w3.org/ns/activitystreams',
          {
            "PropertyValue": "https://schema.org/PropertyValue",
            "value": "https://schema.org/value"
          }
        ],
        type: 'Create',
        actor: this.groupActorId,
        object: {
          type: 'Note',
          content,
        },
        to: [
          'https://www.w3.org/ns/activitystreams#Public',
          this.followersUrl,
        ],
      }),
    })
    .then((res) => {
      if (res.headers.has('Location')) {
        window.location.reload();
      }
    }).catch((error: unknown) => {
      console.log('error', error);
    });
  }

  render() {
    return html`
      <form
        @submit=${this.handleSubmit}
        novalidate>
        <div role="table">
          <label role="row" class="label">
            <span role="columnheader" class="label-text">
              Post
            </span>
            <span role="cell">
              <textarea name="content"></textarea>
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
    "post-form": PostForm;
  }
}