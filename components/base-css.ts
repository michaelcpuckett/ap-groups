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
    border-radius: 8px;
    font-size: .875em;
    font-weight: normal;
  }
l
  .button {
    background-color: var(--accent-color);
    color: var(--text-on-accent-color);
    border: 1px solid;
    border-radius: 8px;
    font-size: 1.25em;
    padding: 4px 12px;
    font-weight: bold;
  }
  
  .button--cta {
    font-size: 1.5em;
  }

  .label {
    display: flex;
    flex-direction: column;
    font-size: 1.25em;
    padding-bottom: 12px;
    border-bottom: 1px solid;
    margin-bottom: 12px;
  }

  .label-text {
    display: block;
    padding: 6px 0;
  }

  .has-error .input {
    background-color: var(--error-color);
  }

  .error-message {
    color: var(--error-color);
    font-size: .875em;
    display: block;
    padding: 6px;
    font-weight: bold;
  }

  .hint-text {
    padding: 6px;
    font-size: .75em;
  }
`;