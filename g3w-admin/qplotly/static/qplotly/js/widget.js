// Add qplotlyWidgetList manager widget
// -------------------------------------------------
// activate widget: append to ga.ui.before_datatable_callbacks for to cala it before DatTable init
ga.ui.before_datatable_callbacks.push(function($widgetItem){
  $widgetItem.find('[data-widget-type="qplotlyWidgetList"]').on('click', async function() {
    const widget = (await import(`${STATIC_BASE_URL}qplotly/js/data-widget-qplotlyWidgetList.js`)).default;
    widget($(this).parents("table").DataTable(), $(this));
  });
});