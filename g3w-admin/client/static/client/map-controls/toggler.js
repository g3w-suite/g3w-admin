const toggler = g3w.app.createMapControl({
  id:            "toggler",
  options: {
    add:         true,
    clickmap:    false,
    tipLabel:    'tools',
    customClass: 'fas fa-grip-vertical',
    onclick() {
      toggler.element.classList.toggle('ungroup');
    }
  },
});

g3w.app.on('mapcontrol:toggled', () => {
  toggler.element.classList.remove('ungroup');
});

document.head.insertAdjacentHTML('beforeend', /* css */`<style>
  .ol-toggler:not(:has(+.ol-control+.ol-control+.ol-control)) {
    display: none !important;
  }
  .ol-toggler:has(+.ol-control+.ol-control+.ol-control) {
    &:not(.ungroup) ~ .ol-control:not(:has(.g3w-ol-toggled), .ol-zoom) {
      display: none !important;
    }
    &.ungroup {
      filter: invert(.8);
      opacity: .7;
    }
    ~ .ol-control:has(.g3w-ol-toggled),
    ~ .ol-zoom {
      order: -1;
    }
  }
</style>`);