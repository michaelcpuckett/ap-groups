import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import {classMap} from 'lit/directives/class-map';
import { AP } from 'activitypub-core-types';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { baseCss } from './base-css';

@customElement('signup-form')
export class SignupForm extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
      padding: 1em;
      border: 1px solid;
      border-radius: 4px;
    }
  `];

  @query('input[name="username"]')
  usernameInputElement: HTMLInputElement|null;

  @query('input[name="email"]')
  emailInputElement: HTMLInputElement|null;

  @query('input[name="password"]')
  passwordInputElement: HTMLInputElement|null;

  @property({type: String})
  private emailError = '';

  @property({type: String})
  private passwordError = '';

  @property({type: String})
  private usernameError = '';

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (!this.usernameInputElement || !this.emailInputElement || !this.passwordInputElement) {
      return;
    }

    const username = this.usernameInputElement.value;
    const email = this.emailInputElement.value;
    const password = this.passwordInputElement.value;

    if (!username) {
      this.usernameError = 'Required';
    }

    if (!email) {
      this.emailError = 'Required';
    }

    if (!password) {
      this.passwordError = 'Required';
    }

    if (this.usernameError || this.emailError || this.passwordError) {
      return;
    }

    fetch('/user', {
      method: 'POST',
      headers: {
        'Accept': 'application/activity+json',
      },
      body: JSON.stringify({
        type: AP.ActorTypes.GROUP,
        email,
        password,
        preferredUsername: username,
      })
    })
    .then(response => response.text())
    .then((result) => {
      try {
        const {
          success,
          error: errorMessage,
          field,
        } = JSON.parse(result);
        
        if (!success) {  
          switch (field) {
            case 'username': {
              this.usernameError = errorMessage;
            }
            break;
            case 'email': {
              this.emailError = errorMessage;
            }
            break;
            case 'password': {
              this.passwordError = errorMessage;
            }
            break;
            default: {
              if (errorMessage.includes('FirebaseError')) {
                const [fullMatch, errorCode] = errorMessage.match(/\(([\w\W]+)\)\./);

                switch (errorCode) {
                  default: {
                    console.log(errorCode);
                  }
                }
              }
            }
            break;
          }

          throw errorMessage;
        }
      } catch (error: unknown) {
        throw error;
      }

      initializeApp({
        projectId: "pickpuck-com",
        apiKey: "AIzaSyB6ocubyR0Ddg7NdmA1bIFiuOH4nnVSI4w",
      });

      signInWithEmailAndPassword(getAuth(), email, password).then(userCredential => {
        userCredential.user.getIdToken().then((token: string) => {
          window.document.cookie = '__session=' + token;
          window.location.href = '/home';
        });
      });
    })
    .catch((error: unknown) => {
      console.log(error);
    });
  }

  private clearUsernameError() {
    this.usernameError = '';
  }

  private clearEmailError() {
    this.emailError = '';
  }

  private clearPasswordError() {
    this.passwordError = '';
  }

  render() {
    return html`
      <form
        @submit=${this.handleSubmit}
        novalidate>
        <label class=${classMap({
          'label': true,
          'has-error': this.usernameError,
        })}>
          <span class="label-text">
            Group Username
          </span>
          <input
            @input=${this.clearUsernameError}
            class="input"
            type="text"
            name="username"
            autocapitalize="off"
          />
          <span class="hint-text">
            No @ sign, please.
          </span>
          ${this.usernameError ? html`
            <span class="error-message">
              ${this.usernameError}
            </span>
        ` : nothing}
        </label>
        <label class=${classMap({
          'label': true,
          'has-error': this.emailError,
        })}>
          <span class="label-text">
            Email
          </span>
          <input
            @input=${this.clearEmailError}
            class="input"
            type="email"
            name="email"
          />
          <span class="hint-text">
            You won't have to verify.
          </span>
          ${this.emailError ? html`
            <span class="error-message">
              ${this.emailError}
            </span>
        ` : nothing}
        </label>
        <label class=${classMap({
          'label': true,
          'has-error': this.passwordError,
        })}>
          <span class="label-text">
            Password
          </span>
          <input
            @input=${this.clearPasswordError}
            class="input"
            type="password"
            name="password"
          />
          <span class="hint-text">
            At least 6 characters.
          </span>
          ${this.passwordError ? html`
            <span class="error-message">
              ${this.passwordError}
            </span>
        ` : nothing}
        </label>
        <button
          class="button"
          type="submit">
          Submit
        </button>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "signup-form": SignupForm;
  }
}