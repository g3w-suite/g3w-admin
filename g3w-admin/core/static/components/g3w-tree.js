/**
 * @file
 * @since g3w-admin@v4.0
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_components
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details
 */
if (!customElements.get('g3w-tree')) {
  customElements.define('g3w-tree', class extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /*html*/ `
      <style>
        details > summary ~ * {
          padding:.5em;
          font-weight:300;
          line-height:1.5;
          display:list-item;
          list-style-position: inside;
          margin-left: 1em;
        }
        details > summary {
          border-bottom: 1px solid #e2e8f0;
          font-size: 1.1em;
          padding:1em .5em;
          user-select:none;
          cursor:pointer;
          font-weight: bold;
        }
        </style>`;
        this.shadowRoot.appendChild(this.#createTree(JSON.parse(this.getAttribute('data'))));
    }
    #createTree(data) {
      const fragment = document.createDocumentFragment();
      data.forEach(item => {
        let details;
        if (item.nodes) {
          details = document.createElement('details');
          details.open = true;
          const summary = document.createElement('summary');
          summary.textContent = item.text;
          details.appendChild(summary);
          details.appendChild(this.#createTree(item.nodes));
        } else {
          details = document.createElement('div');
          details.textContent = item.text;
        }
        fragment.appendChild(details);
      });
      return fragment;
    }
  });
}