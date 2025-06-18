// Add qplotlyWidgetList manager widget
// -------------------------------------------------
// activate widget: append to ga.ui.before_datatable_callbacks for to cala it before DatTable init
ga.ui.before_datatable_callbacks.push(function($widgetItem){
  $widgetItem.find('[data-widget-type="qplotlyWidgetList"]').on('click', async function (e) {
    const widget = 'qplotlyWidgetList';
    const a = (await import(`${STATIC_BASE_URL}components/data-widget-${widget}.js`));
    a[widget]($(this).parents("table").DataTable(), $(this));
  });
});