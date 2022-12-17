import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { baseCss } from './base-css';
import { AP } from 'activitypub-core-types';

const DEFAULT_BANNER_IMAGE_URL = 'https://media.michaelpuckett.engineer/uploads/banner.png';

@customElement('group-details')
export class GroupDetails extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }

    [type="file"] {
      clip: rect(1px, 1px, 1px, 1px);
      height: 1px;
      overflow: hidden;
      position: absolute;
      width: 1px;
    }

    .avatar {
      max-width: 200px;
    }
  `];

  private defaultBannerImage: AP.Image = {
    type: 'Image',
    url: new URL(DEFAULT_BANNER_IMAGE_URL)
  } as AP.Image;

  @query('input[name="name"]')
  nameInputElement: HTMLInputElement|null;

  @query('input[name="manager"]')
  managerInputElement: HTMLInputElement|null;

  @query('textarea[name="rules"]')
  rulesTextareaElement: HTMLTextAreaElement|null;

  @query('textarea[name="summary"]')
  summaryTextareaElement: HTMLTextAreaElement|null;

  @query('input[name="sensitive"]')
  sensitiveElement: HTMLInputElement|null;

  @query('input[name="manuallyApprovesFollowers"]')
  manuallyApprovesFollowersElement: HTMLInputElement|null;

  @query('form[name="upload"]')
  uploadFormElement: HTMLFormElement|null;

  @query('[type="file"]')
  fileInputElement: HTMLInputElement|null;

  @property({type: String, attribute: 'outbox-url'})
  private outboxUrl?: string;

  @property({type: String, attribute: 'upload-media-url'})
  private uploadMediaUrl?: string;

  @property({type: Boolean, attribute: 'manually-approves-followers'})
  private manuallyApprovesFollowers?: boolean;

  @property({type: Boolean })
  private sensitive?: boolean;

  @property({type: String, attribute: 'group-actor-id'})
  private groupActorId?: string;

  @property({type: String})
  private name?: string;

  @property({type: String})
  private manager?: string;

  @property({type: String})
  private rules?: string;

  @property({type: String})
  private summary?: string;

  @property({type: Object})
  private icon?: AP.Image;

  @property({ type: Boolean })
  private isFileReadyToUpload = false;

  private async handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    if (!this.nameInputElement || !this.managerInputElement || !this.rulesTextareaElement || !this.summaryTextareaElement || !this.uploadFormElement || !this.manuallyApprovesFollowersElement || !this.sensitiveElement) {
      return;
    }

    const name = this.nameInputElement.value;
    const manager = this.managerInputElement.value || 'Anonymous';
    const rules = this.rulesTextareaElement.value || 'Be nice.';
    const summary = this.summaryTextareaElement.value;
    const manuallyApprovesFollowers = this.manuallyApprovesFollowersElement.checked;
    const sensitive = this.sensitiveElement.checked;

    if (this.isFileReadyToUpload) {
      await this.handleAvatarUpload();
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
        type: 'Update',
        actor: this.groupActorId,
        object: {
          id: this.groupActorId,
          name,
          summary,
          manuallyApprovesFollowers,
          sensitive,
          image: this.defaultBannerImage,
          attachment: [{
            type: 'PropertyValue',
            name: 'Group Manager',
            value: manager,
          }, {
            type: 'PropertyValue',
            name: 'Group Rules',
            value: rules,
          }],
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

  private async handleAvatarUpload() {
    await fetch(this.uploadMediaUrl, {
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
      ${(this.icon && !this.isFileReadyToUpload) ? html`
        <img
          class="avatar"
          src=${this.icon.url}
        />
      ` : nothing}

      <form name="upload">
        <input
          type="hidden"
          name="object"
          value=${JSON.stringify({
            "type": "Image"
          })}
        />
        <label class="label">
          <span class="label-text">
            Change Profile Pic
          </span>
          <input
            type="file"
            name="file"
            accept="image/*"
            @change=${this.handleFileInputChange}
          />
          <button
            class="button button--tag"
            type="button"
            @click=${this.handleFileInputTriggerClick}>
            ${this.isFileReadyToUpload ? 'Replace File' : 'Select File to Upload'}
          </button>
        </label>
      </form>

      <form
        @submit=${this.handleSubmit}
        novalidate>
        <div role="table">
          <label role="row" class="label">
            <span role="columnheader" class="label-text">
              Group Name
            </span>
            <span role="cell">
              <input type="text" value=${this.name ?? ''} name="name" />
            </span>
          </label>
          <label role="row" class="label">
            <span role="columnheader" class="label-text">
              18+ / Sensitive / NSFW?
            </span>
            <span role="cell">
              <input
                type="checkbox"
                class="toggle-button"
                name="sensitive"
                ?checked=${this.sensitive}
              />
              <p class="hint-text">
                The group will be hidden in the main directory.
              </p>
            </span>
          </label>
          <label role="row" class="label">
            <span class="label-text" role="columnheader">
              Group Manager
            </span>
            <span role="cell">
              <input type="text" name="manager" value=${this.manager ?? 'Anonymous'} />
            </span>
            <span class="hint-text">
              The @handle where people can contact you, otherwise "Anonymous"
            </span>
          </label>
          <label role="row" class="label">
            <span class="label-text" role="columnheader">
              Group Description
            </span>
            <span role="cell">
              <textarea name="summary">${this.summary ?? ''}</textarea>
            </span>
          </label>
          <label role="row" class="label">
            <span class="label-text" role="columnheader">
              Group Rules
            </span>
            <span role="cell">
              <textarea name="rules">${this.rules ?? 'Be nice.'}</textarea>
            </span>
          </label>
          <label role="row" class="label">
            <span role="columnheader" class="label-text">
              Manually Approve Members
            </span>
            <span role="cell">
              <input
                type="checkbox"
                class="toggle-button"
                name="manuallyApprovesFollowers"
                ?checked=${this.manuallyApprovesFollowers}
              />
            </span>
          </label>
          <label role="row" class="label">
            <span role="columnheader" class="label-text">
              Banner Image
            </span>
            <span role="cell">
              <img src=${DEFAULT_BANNER_IMAGE_URL} height="100" />
            </span>
            <span class="hint-text">
              This standardized header banner cannot be changed.
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