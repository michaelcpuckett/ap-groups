import {LitElement, html, css, nothing, PropertyValues} from 'lit';
import {customElement, property, query, state} from 'lit/decorators';
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

  @property({type: String, attribute: 'followers-url'})
  private followersUrl?: string;

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

  @state()
  private textSummary = '';

  @state()
  private textRules = '';

  override firstUpdated() {
    const summaryWrapperElement = window.document.createElement('div');
    summaryWrapperElement.innerHTML = this.summary ?? '';
    this.textSummary = this.getInnerText(summaryWrapperElement);

    const rulesWrapperElement = window.document.createElement('div');
    rulesWrapperElement.innerHTML = this.rules ?? 'Be nice.';
    this.textRules = this.getInnerText(rulesWrapperElement);
  }

  private getInnerText(element: Element) {
    return Array.from(element.childNodes).map((node: Element) => {
      if (node.nodeType === 1) {
        if (node.nodeName.toLowerCase() === 'p') {
          return this.getInnerText(node) + '\n\n';
        } else if (node.nodeName.toLowerCase() === 'br') {
          return this.getInnerText(node) + '\n';
        } else {
          return this.getInnerText(node);
        }
      }

      if (node.nodeType === 3) {
        return node.nodeValue;
      }

      return '';
    }).join('').replace(/\n+$/, '');
  }

  private async handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    if (!this.nameInputElement || !this.managerInputElement || !this.rulesTextareaElement || !this.summaryTextareaElement || !this.uploadFormElement || !this.manuallyApprovesFollowersElement || !this.sensitiveElement) {
      return;
    }

    const name = this.nameInputElement.value;
    const manager = this.managerInputElement.value || 'Anonymous';
    const manuallyApprovesFollowers = this.manuallyApprovesFollowersElement.checked;
    const sensitive = this.sensitiveElement.checked;

    const rawRules = this.rulesTextareaElement.value || 'Be nice.';
    const htmlRules = this.encode4HTML(rawRules);

    const rawSummary = this.summaryTextareaElement.value;

    const summaryWithLinks = [];
    for (const word of rawSummary.split(' ')) {
      if (word.startsWith('https://')) {
        summaryWithLinks.push(`<a href="${word}">${word}</a>`);
      } else {
        summaryWithLinks.push(word);
      }
    }

    const htmlSummary = this.encode4HTML(summaryWithLinks.join(' '));

    const hashtags = [];
    const summary = htmlSummary.replace(/\#([\w]+)/g, (match: string, hashtag: string) => {
      hashtags.push(hashtag);
      return `<a href="https://chirp.social/hashtag/${hashtag}">#${hashtag}</a>`;
    });

    if (this.isFileReadyToUpload) {
      await this.handleAvatarUpload();
    }

    const group = {
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
        value: htmlRules,
      }],
      ...hashtags.length ? {
        tag: [...new Set(hashtags)].map(hashtag => ({
          type: 'Hashtag',
          name: `#${hashtag}`,
          url: `https://chirp.social/hashtag/${hashtag}`,
        })),
      } : null,
    };

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
        to: [
          'https://www.w3.org/ns/activitystreams#Public',
          this.followersUrl,
        ],
        actor: this.groupActorId,
        object: group,
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

  private encode4HTML(str: string) {
    return str
        .replace(/\r\n?/g,'\n')
        // normalize newlines - I'm not sure how these
        // are parsed in PC's. In Mac's they're \n's
        .replace(/(^((?!\n)\s)+|((?!\n)\s)+$)/gm,'')
        // trim each line
        .replace(/(?!\n)\s+/g,' ')
        // reduce multiple spaces to 2 (like in "a    b")
        .replace(/^\n+|\n+$/g,'')
        // trim the whole string
        .replace(/\n{2,}/g,'</p><p>')
        // replace 2 or more consecutive empty lines with these
        .replace(/\n/g,'<br />')
        // replace single newline symbols with the <br /> entity
        .replace(/^(.+?)$/,'<p>$1</p>');
        // wrap all the string into <p> tags
        // if there's at least 1 non-empty character
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
              Group Description / Hashtags for Discovery
            </span>
            <span role="cell">
              <textarea name="summary" rows="5">${this.textSummary ?? ''}</textarea>
            </span>
            <span class="hint-text">
              Add #hashtags here to be featured in the directory. Adult hashtags are not allowed.
            </span>
          </label>
          <label role="row" class="label">
            <span class="label-text" role="columnheader">
              Group Rules
            </span>
            <span role="cell">
              <textarea name="rules" rows="5">${this.textRules ?? 'Be nice.'}</textarea>
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