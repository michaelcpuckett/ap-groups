import { css } from 'lit';

export const baseCss = css`
  * {
    box-sizing: border-box;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
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

  .region a {
    font-weight: bold;
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
    cursor: pointer;
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
    border-radius: 0;
    font-size: .875em;
    font-weight: normal;
    background-color: var(--dark-background-color);
    color: var(--text-on-dark-background-color);
  }

  .button {
    background-color: var(--light-background-color);
    color: var(--text-on-light-background-color);
    border-radius: 0;
    font-size: 1.125em;
    padding: .5em .875em;
    max-width: max-content;
    box-shadow: 1px 2px 1px black;
    border: 1px solid;
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

  .toggle-button {
    width: auto;
    appearance: none;
    background: gray;
    width: 60px;
    height: 30px;
    border-radius: 0;
    position: relative;
  }

  .toggle-button:after {
    content: '';
    background: var(--primary-color);
    position: absolute;
    top: 4px;
    left: 4px;
    height: calc(100% - 8px);
    width: calc(50% - 8px);
    border-radius: 0;
  }

  .toggle-button:checked {
    background: var(--accent-color);
  }

  .toggle-button:checked:after {
    left: unset;
    right: 4px;
  }

  .regions {
    display: grid;
  }

  .region {
    padding: 32px;
    border-radius: 0;
    background-color: var(--dark-background-color);
    color: var(--text-on-dark-background-color);
    width: 100%;
    border: 1px solid;
    font-size: 1.125em;
  }

  .eyebrow {
    text-transform: uppercase;
    font-size: .75em;
    letter-spacing: .1ch;
  }

  .avatar {
    overflow: hidden;
    display: inline-flex;
  }

  .avatar--small {
    border-radius: 0;
    height: 70px;
    width: 70px;
    background: var(--accent-color);
  }

  .permalink {
    display: block;
    font-size: .75em;
    text-align: center;
  }

  .actor-lockup {
    display: inline-flex;
    flex-direction: column;
    text-align: center;
    place-items: center;
    place-content: center;
    border: 1px solid lightgray;
    border-radius: 0;
    padding: 8px;
    aspect-ratio: 1;
  }

  .actor-lockup:not(:hover) {
    text-decoration: none;
  }

  .actor-username {
    display: block;
    color: var(--medium-background-color);
    font-weight: bold;
  }

  .actor-hostname {
    display: block;
    font-size: .75em;
  }
`;