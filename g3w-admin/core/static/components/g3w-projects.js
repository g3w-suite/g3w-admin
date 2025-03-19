/**
 * @file
 * @since g3w-admin@v4.0
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_components
 */
if (!customElements.get('g3w-projects')) {
  customElements.define('g3w-projects', class extends HTMLElement {
    #wrapper;
    async connectedCallback() {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /*html*/ `
        <style>
          @keyframes data-loader { 0% { background-position: -468px 0 } 100% { background-position: 468px 0 } }
          [data-loader]          { background: #fff; padding: 12px; flex: 1}
          [data-loader] > *      { animation: data-loader 1s linear infinite forwards; background: linear-gradient(to right, #eee 8%, #ddd 18%, #eee 33%);  height: 96px; position: relative; }
          [data-loader] > * > *  { background: #fff; position: absolute; }
        </style>
        <div class="g3w-projects"></div>
      `;
      try {
        this.#wrapper = this.#wrapper || this.shadowRoot.querySelector('.g3w-projects');
        const urls = JSON.parse(this.getAttribute('urls'));
        this.#wrapper.innerHTML = urls.map(url => /* html */`
        <div data-loader="${url}">
          <div>
            <div style="top: 0;    right: 0; left: 40px;  height: 10px;"></div>
            <div style="top: 10px;           left: 40px;  height: 8px; width: 10px;"></div>
            <div style="top: 24px; right: 0; left: 230px; height: 6px;"></div>
            <div style="top: 18px; right: 0; left: 40px;  height: 6px;"></div>
            <div style="top: 24px;           left: 40px;  height: 6px; width: 10px;"></div>
            <div style="top: 10px; right: 0; left: 300px; height: 8px; width: auto;"></div>
            <div style="top: 30px; right: 0; left: 40px;  height: 10px;"></div>
            <div style="top: 40px; right: 0; left: 0;     height: 20px;"></div>
            <div style="top: 60px; right: 0; left: 380px; height: 8px; width: auto;"></div>
            <div style="top: 68px; right: 0; left: 0;     height: 6px;"></div>
            <div style="top: 74px; right: 0; left: 420px; height: 8px; width: auto;"></div>
            <div style="top: 82px; right: 0; left: 0;     height: 6px;"></div>
            <div class="top: 88px; right: 0; left: 300px; height: 8px; width: auto;"></div>
          </div>
        </div>`
        ).join('');
        this.#wrapper.innerHTML = (await Promise.all(urls.map(async url => await (await fetch(url)).text()))).join('');
        this.insertAdjacentElement('afterend', this.#wrapper);
        g3wadmin.ui.initRadioCheckbox(this.#wrapper);
        if (this.hasAttribute('sortable')) {
          this.#sortable();
        }
        this.remove();
      } catch (e) {
        g3wadmin.widget.showError(e);
      }
    }

    #sortable() {
      let dragged = null;
      this.#wrapper.querySelectorAll('tbody tr').forEach(row => {
        row.setAttribute('draggable', true);
        row.addEventListener('mouseover',  () => { row.style.cursor = 'move'; });
        row.addEventListener('mouseleave', () => { row.style.cursor = null; });
        row.addEventListener('dragstart',  () => { dragged = row; });
        row.addEventListener('dragend',    () => { dragged = null; });
        row.addEventListener('dragover',   e => { e.preventDefault(); row.style.border="2px dashed #000"; });
        row.addEventListener('dragleave',  () => { row.style.border=null; });
        row.addEventListener('drop', e => {
          if (dragged) {
            dragged.parentNode.insertBefore(dragged, dragged == row.nextSibling ? row : row.nextSibling);
            fetch(`/qdjango/jx/project/${dragged.id.substring(15)}/setorder/`, {
                method: 'POST',
                body:  new URLSearchParams([
                  ...Array.from(row.parentNode.children).map(tr => tr.id).filter(Boolean).map(id => ["new_order[]", id]),
                  ["csrfmiddlewaretoken", $.cookie('csrftoken')],
                ]),
            });
          }
          row.style.border=null;
        });
      });
      // TODO: check if deprecated
      const self = this;
      $(document).ajaxComplete(function() {
        if (this.URL){
          self.#sortable();
        }
      });
    }

  });
}