import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import {classMap} from 'lit/directives/class-map';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { baseCss } from './base-css';

@customElement('login-form')
export class LoginForm extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
      padding: 1em;
      border: 1px solid;
    }
  `];

  @query('input[name="email"]')
  emailInputElement: HTMLInputElement|null;

  @query('input[name="password"]')
  passwordInputElement: HTMLInputElement|null;

  @property({type: String})
  private emailError = '';

  @property({type: String})
  private passwordError = '';

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    if (!this.emailInputElement || !this.passwordInputElement) {
      return;
    }

    const email = this.emailInputElement.value;
    const password = this.passwordInputElement.value;

    if (!email) {
      this.emailError = 'Required';
    }

    if (!password) {
      this.passwordError = 'Required';
    }

    if (this.emailError || this.passwordError) {
      return;
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
    }).catch((error: unknown) => {
      const errorMessage = error.toString();

      if (errorMessage.includes('FirebaseError')) {
        const [fullMatch, errorCode] = errorMessage.match(/\(([\w\W]+)\)\./);

        switch (errorCode) {
          case 'auth/user-not-found': {
            this.emailError = 'User not found.';
          }
          break;
          case 'auth/wrong-password': {
            this.passwordError = 'Wrong password. You can reset it below.'
          }
          break;
          default: {
            console.log(errorCode);
          }
          break;
        }
      } else {
        console.log(errorMessage);
      }
    });
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
            autocomplete="email"
          />
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
            autocomplete="password"
            name="password"
          />
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
    "login-form": LoginForm;
  }
}