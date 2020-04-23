from import_export.resources import ModelResource, ModelDeclarativeMetaclass


def modelresource_factory(model, resource_class=ModelResource, **kwargs):
    """
    Factory for creating ``ModelResource`` django-import-export class for given Django model.
    :param model: Django Model Object
    :param resource_class: ImportExport resources class, ModelResource default.
    :return: ModelResource class
    """
    attrs = {'model': model}
    attrs.update(kwargs)
    Meta = type(str('Meta'), (object,), attrs)

    class_name = model.__name__ + str('Resource')

    class_attrs = {
        'Meta': Meta,
    }

    metaclass = ModelDeclarativeMetaclass
    return metaclass(class_name, (resource_class,), class_attrs)