import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { repeat } from 'lit/directives/repeat';
import { baseCss } from './base-css';

@customElement('pagination-nav')
export class PaginationNav extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
      font-weight: bold;
    }

    ol {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      margin: 0;
      padding: 0;
      gap: 8px;
    }

    a {
      color: var(--text-on-light-background-color);
    }
  `];

  @property({type: String, attribute: 'first-page'})
  private firstPage?: string;

  @property({type: String, attribute: 'prev-page'})
  private prevPage?: string;

  @property({type: String, attribute: 'next-page'})
  private nextPage?: string;

  @property({type: String, attribute: 'last-page'})
  private lastPage?: string;

  @property({ type: Number })
  private firstPageIndex?: number;
  
  @property({ type: Number })
  private prevPageIndex?: number;

  @property({ type: Number })
  private nextPageIndex?: number;

  @property({ type: Number })
  private lastPageIndex?: number;

  @property({ type: Number })
  private totalPages?: number;

  @property({ type: Number })
  private currentPageIndex?: number;

  @property({ type: String })
  private baseUrlPath?: string;

  @property({ type: Boolean })
  private isCurrent = false;

  override firstUpdated() {
    this.baseUrlPath = new URL(this.firstPage).pathname;
    this.isCurrent = new URL(this.firstPage).searchParams.has('current');
    this.firstPageIndex = Number(new URL(this.firstPage).searchParams.get('page')) || 1;
    this.lastPageIndex = Number(new URL(this.lastPage).searchParams.get('page')) || 1;
    this.totalPages = this.lastPageIndex - this.firstPageIndex + 1;

    let currentPageIndex = 1;

    if (this.prevPage) {
      this.prevPageIndex = Number(new URL(this.prevPage).searchParams.get('page')) || 1;
      currentPageIndex = this.prevPageIndex + 1;
    } else if (this.nextPage) {
      this.nextPageIndex = Number(new URL(this.nextPage).searchParams.get('page')) || 1;
      currentPageIndex = this.nextPageIndex - 1;
    } else {
      currentPageIndex = 1;
    }

    this.currentPageIndex = currentPageIndex;
  }

  render() {
    if (!this.baseUrlPath || !this.currentPageIndex) {
      return html`
        ...
      `;
    }

    if (this.totalPages === 1) {
      return html`
        <ol>
          <li>
            Page 1 / 1
          </li>
        </ol>
      `;
    }

    return html`
      <ol>
        ${repeat(new Array(this.totalPages), (value, index) => {
          const pageIndex = index + 1;
          const url = pageIndex === this.currentPageIndex ? '' : `${this.baseUrlPath}?page=${pageIndex}${this.isCurrent ? '&current' : ''}`;

          if (pageIndex === this.firstPageIndex) {
            return url ? html`
              <li>
                <a href=${url}>
                  ⇤ ${pageIndex}
                </a>
              </li>
            ` : html`
              <li>
                ⇤ ${pageIndex}
              </li>
            `;
          }

          if (pageIndex === this.lastPageIndex) {
            return url ? html`
              <li>
                <a href=${url}>
                ${pageIndex} ⇥
                </a>
              </li>
            ` : html`
              <li>
                ${pageIndex} ⇥
              </li>
            `;
          }

          if (pageIndex === this.prevPageIndex) {
            return url ? html`
              <li>
                <a href=${url}>
                  ← (${pageIndex})
                </a>
              </li>
            ` : html`
              <li>
                ${pageIndex}
              </li>
            `;
          }
          
          return url ? html`
            <li>
              <a href=${url}>
                ${pageIndex}
              </a>
            </li>
          ` : html`
            <li>
              ${pageIndex}
            </li>
          `;
        })}
      </ol>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pagination-nav": PaginationNav;
  }
}