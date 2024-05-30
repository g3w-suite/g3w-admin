/**
 * @since g3w-admin@v3.8.0
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_components
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
 * @see https://docs.djangoproject.com/en/3.2/topics/i18n/translation/#internationalization-in-javascript-code
 */
customElements.define('g3w-dialog', class extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = /*html*/ `<style>
    dl                        { display: grid; grid-template: auto / .5fr 1fr; margin-bottom: 0; word-break: break-all; }
    dt                        { background: #fee; }
    dd                        { background: hsl(220, 10%, 95%); }
    dt, dd                    { margin: 0; padding: .3em .5em; border-top: 1px solid #fff; }
    dialog                    { border-width: 1px; padding: 0; max-width: 90%; max-height: 90%; }
    slot[name="modal-header"] { display: block; position: sticky; top: 0; background: #fff; padding: 15px; border-bottom: 1px solid #f4f4f4;}
    slot[name="modal-body"]   { display: block; padding: 1em; }
    slot[name="modal-footer"] { display: block; padding: 15px; text-align: center; border-top: 1px solid #f4f4f4; }
    .close                    { cursor: pointer; border: none; padding: 5px 10px; font-size: 2rem; text-transform: lowercase; letter-spacing: 1px;}
    ::backdrop                { backdrop-filter: blur(3px); }
    dialog.spin > *           { display: none; }
    dialog.spin               { position: fixed; height: 10em; width: 10em; overflow: show; margin: auto; inset: 0; background-color: transparent; border: none; }
    dialog.spin::before,
    dialog.spin::after        { content: ''; width: 100%; height: 100%; border-radius: 50%; background-color: #f39c12; opacity: 0.6; position: absolute; top: 0; left: 0; animation: bounce 2.0s infinite ease-in-out; }
    .modal-backdrop           { position: fixed; inset: 0; }
    dialog.spin::after        { animation-delay: -1.0s; }
    @-webkit-keyframes bounce { 0%, 100% { transform: scale(0) }                       50% { transform: scale(1) } }
    @keyframes bounce         { 0%, 100% { transform: scale(0); transform: scale(0); } 50% { transform: scale(1); transform: scale(1); } }
    </style>
      <slot name="modal-button" onclick="this.nextElementSibling.showPopover()" style="cursor: pointer;">Open modal</slot>
      <dialog popover>
        <slot name="modal-header">
          <button class="close" style="float: right;">&times;</button>
          <slot name="modal-title"><h2>${ this.getAttribute('modal-title') }</h2></slot>
        </slot>
        <slot name="modal-body"></slot>
        <slot name="modal-footer">
          <button class="close">${ globalThis.gettext('Close') }</button>
        </slot>
      </dialog>
      <div class="modal-backdrop" hidden></div>`;
    const p = this.shadowRoot.querySelector('dialog');
    const b = this.shadowRoot.querySelector('.modal-backdrop');
    this.shadowRoot.querySelectorAll('button.close').forEach(d => d.onclick = () => p.hidePopover())
    p.addEventListener('beforetoggle', async e => {
      try {
        if ('closed' == e.newState) return b.setAttribute('hidden', '');
        b.removeAttribute('hidden');
        p.classList.add('spin');
        const url = this.getAttribute('url');
        if (url) p.querySelector('slot[name="modal-body"]').innerHTML = (await (await fetch(url)).text());
      } catch (e) {
        p.querySelector('slot[name="modal-body"]').innerHTML = `SERVER ERROR: ${e}`;
      } finally {
        p.classList.remove('spin');
      }
    });
  }
});