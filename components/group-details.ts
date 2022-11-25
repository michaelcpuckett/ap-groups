import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

@customElement('group-details')
export class GroupDetails extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
      padding: 1em;
      border: 1px solid;
      border-radius: 4px;
    }

    [type="file"] {
      clip: rect(1px, 1px, 1px, 1px);
      height: 1px;
      overflow: hidden;
      position: absolute;
      width: 1px;
    }
  `];

  @query('input[name="name"]')
  nameInputElement: HTMLInputElement|null;

  @query('textarea[name="summary"]')
  summaryTextareaElement: HTMLTextAreaElement|null;

  @query('form[name="upload"]')
  uploadFormElement: HTMLFormElement|null;

  @query('[type="file"]')
  fileInputElement: HTMLInputElement|null;

  @property({type: String, attribute: 'outbox-url'})
  private outboxUrl?: string;

  @property({type: String, attribute: 'upload-media-url'})
  private uploadMediaUrl?: string;

  @property({type: String, attribute: 'group-actor-id'})
  private groupActorId?: string;

  @property({type: String})
  private name?: string;

  @property({type: String})
  private summary?: string;

  @property({type: Object})
  private icon?: AP.Image;

  @property({ type: Boolean })
  private isFileReadyToUpload = false;

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    if (!this.nameInputElement || !this.summaryTextareaElement || !this.uploadFormElement) {
      return;
    }

    const name = this.nameInputElement.value;
    const summary = this.summaryTextareaElement.value;

    fetch(this.outboxUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Update',
        actor: this.groupActorId,
        object: {
          id: this.groupActorId,
          name,
          summary,
        },
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

  private handleAvatarUpload(event: SubmitEvent) {
    event.preventDefault();

    fetch(this.uploadMediaUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: new FormData(this.uploadFormElement),
    })
    .then(async (res) => {
      if (res.headers.has('Location')) {
        const activity = await fetch(res.headers.get('Location'), {
          headers: {
            'Accept': 'application/activity+json',
          },
        }).then(res => res.json());

        fetch(this.outboxUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/activity+json',
          },
          body: JSON.stringify({
            '@context': 'https://www.w3.org/ns/activitystreams',
            type: 'Update',
            actor: this.groupActorId,
            object: {
              id: this.groupActorId,
              icon: activity.object,
            },
          }),
        })
        .then((res) => {
          if (res.headers.has('Location')) {
            window.location.reload();
          }
        }).catch((error: unknown) => {
          console.log('error', error);
        });
      } else {
        throw new Error('Bad response.');
      }
    }).catch((error: unknown) => {
      console.log('error', error);
    });    
  }

  private handleFileInputChange() {
    this.isFileReadyToUpload = !!this.fileInputElement?.files.length;
  }

  private handleFileInputTriggerClick() {
    this.fileInputElement?.click();
  }

  render() {
    return html`
      ${this.icon ? html`<img src=${this.icon.url} />` : html`<p>No avatar set.</p>`}

      <form name="upload" @submit=${this.handleAvatarUpload}>
        <input type="hidden" name="object" value=${JSON.stringify({
          "type": "Image"
        })} />
        <label class="label">
          <span class="label-text">
            Profile Pic
          </span>
          <input
            type="file"
            name="file"
            accept="image/*"
            @change=${this.handleFileInputChange}
          />
          <button
            class="button"
            type="button"
            @click=${this.handleFileInputTriggerClick}>
            ${this.isFileReadyToUpload ? html`Replace File` : html`Select File to Upload`}
          </button>
        </label>
        ${this.isFileReadyToUpload ? html`
          <button class="button" type="submit">
            Ready to Upload
          </button>
        ` : nothing}
      </form>

      <hr />

      <form
        @submit=${this.handleSubmit}
        novalidate>
        <div role="table">
          <label role="row" class="label">
            <span role="columnheader" class="label-text">
              Name
            </span>
            <span role="cell">
              <input type="text" value=${this.name ?? ''} name="name" />
            </span>
          </label>
          <label role="row" class="label">
            <span class="label-text" role="columnheader">
              Summary
            </span>
            <span role="cell">
              <textarea name="summary">${this.summary ?? ''}</textarea>
            </span>
          </label>
        </div>
        <button type="submit" class="button">
          Save Profile
        </button>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "group-details": GroupDetails;
  }
}