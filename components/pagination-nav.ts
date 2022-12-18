import {LitElement, html, css, nothing} from 'lit';
import {customElement, property, query} from 'lit/decorators';
import { repeat } from 'lit/directives/repeat';
import { baseCss } from './base-css';

@customElement('pagination-nav')
export class PaginationNav extends LitElement {
  static styles = [baseCss, css`
    :host {
      display: block;
    }

    ol {
      list-style: none;
      display: flex;
      margin: 0;
      padding: 0;
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
    this.totalPages = Math.max(1, this.lastPageIndex - this.firstPageIndex);

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

    return html`
      <ol>
        ${repeat(new Array(this.totalPages), (value, index) => {
          const pageIndex = index + 1;

          if (pageIndex === this.currentPageIndex) {
            return html`
              <li>
                Page ${pageIndex} / ${this.totalPages}
              </li>   
            `;
          }

          const url = `${this.baseUrlPath}?page=${pageIndex}${this.isCurrent ? '&current' : ''}`;

          if (pageIndex === this.firstPageIndex) {
            return html`
              <li>
                <a href=${url}>
                  ⇤
                </a>
              </li>
            `;
          }

          if (pageIndex === this.lastPageIndex) {
            return html`
              <li>
                <a href=${url}>
                  ⇥
                </a>
              </li>
            `;
          }

          if (pageIndex === this.prevPageIndex) {
            return html`
              <li>
                <a href=${url}>
                  ←
                </a>
              </li>
            `;
          }

          if (pageIndex === this.nextPageIndex) {
            return html`
              <li>
                <a href=${url}>
                  →
                </a>
              </li>
            `;
          }

          return html`
            <li>
              <a href=${url}>
                ${pageIndex}
              </a>
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