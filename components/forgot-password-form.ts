import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import {classMap} from 'lit/directives/class-map';
import { initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { baseCss } from './base-css';

@customElement('forgot-password-form')
export class ForgotPasswordForm extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
      padding: 1em;
      border: 1px solid;
      border-radius: 4px;
    }
  `];

  @query('input[name="email"]')
  emailInputElement: HTMLInputElement|null;

  @property({type: String})
  private emailError = '';

  @property({type: Boolean})
  private isComplete = false;

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    if (!this.emailInputElement) {
      return;
    }

    const email = this.emailInputElement.value;

    if (!email) {
      this.emailError = 'Required';
    }

    if (this.emailError) {
      return;
    }

    initializeApp({
      projectId: "pickpuck-com",
      apiKey: "AIzaSyB6ocubyR0Ddg7NdmA1bIFiuOH4nnVSI4w",
    });

    sendPasswordResetEmail(getAuth(), email)
    .then(() => {
      this.isComplete = true;
    })
    .catch((error: unknown) => {
      console.log(error);
    });
  }

  private clearEmailError() {
    this.emailError = '';
  }

  render() {
    if (this.isComplete) {
      return html`
        <p>
          The reset password email has been sent via Firebase. Please check your spam folder.
        </p>
      `;
    }

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
          />
          ${this.emailError ? html`
            <span class="error-message">
              ${this.emailError}
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
    "forgot-password-form": ForgotPasswordForm;
  }
}