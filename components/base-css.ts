import {css} from 'lit';

export const baseCss = css`
  * {
    box-sizing: border-box;
  }

  img {
    max-width: 100%;
  }

  a {
    color: lightpink;
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
    background-color: LinkText;
    color: white;
    border: 1px solid;
    border-radius: 8px;
    padding: 4px 12px;
    font-weight: bold;
  }

  .label {
    display: flex;
    flex-direction: column;
  }

  .has-error .label-text {
    color: red;
  }

  .has-error .input {
    border-color: red;
  }

  .error-message {
    color: red;
  }
`;