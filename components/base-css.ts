import { css } from 'lit';

export const baseCss = css`
  * {
    box-sizing: border-box;
  }

  img {
    max-width: 100%;
  }

  a {
    color: var(--link-color);
  }

  button {
    appearance: none;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 0;
    font: inherit;
    line-height: inherit;
    background: transparent;
    display: inline-flex;
    min-height: 48px;
    min-width: 48px;
    place-items: center;
    place-content: center;
  }

  textarea,
  input {
    font: inherit;
    line-height: inherit;
    width: 100%;
  }

  .textarea,
  .input {
    padding: .5em;
    border: 1px solid;
    border-radius: 4px;
  }

  .button {
    background-color: var(--primary-color);
    color: var(--text-on-primary-color);
    border: 1px solid;
    border-radius: 8px;
    padding: 4px 12px;
    font-weight: bold;
  }
  
  .button--cta {
    font-size: 1.5em;
  }

  .label {
    display: flex;
    flex-direction: column;
  }

  .has-error .label-text {
    color: var(--error-color);
  }

  .has-error .input {
    border-color: var(--error-color);
  }

  .error-message {
    color: var(--error-color);
  }
`;