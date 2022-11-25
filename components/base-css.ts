import { css } from 'lit';

export const baseCss = css`
  * {
    box-sizing: border-box;
  }

  h1 {
    text-align: center;
  }

  h1,
  h2 {
    font-weight: normal;
    margin: 0;
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
    background-color: var(--dark-background-color);
    color: var(--text-on-dark-background-color);
  }

  .button {
    background-color: var(--dark-background-color);
    color: var(--text-on-dark-background-color);
    border-radius: 8px;
    font-size: 1.125em;
    padding: .5em .875em;
    max-width: max-content;
  }

  .button--tag {
    font-size: .95em;
    padding: 4px 8px;
    min-height: 32px;
    min-width: 32px;
  }
  
  .button--cta {
    font-size: 1.5em;
    font-weight: bold;
    background: var(--accent-color);
    color: var(--text-on-accent-color);
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