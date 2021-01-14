from editing.views import SESSION_KEY
import os
import logging

logger = logging.getLogger('module_editing')



def get_relations_data_by_fid(relationsedits_data, fid):
    """
    get relations data from 'relationsedits' param from client post data
    """
    for data in relationsedits_data:
        if str(data['fid']) == str(fid):
            return data['relations']


def get_dict_relations_data(fields):
    """
    Get dict(name, value) list from client and return dict key>=value
    """
    return {f['name']: f['value'] if 'value' in f else None for f in fields}


def build_key_falue_from_choiches(choices):
    """
    Return a key -> value list object from model_utils choices
    """
    return [{'key': c[0], 'value': u'({}) {}'.format(c[0], c[1])} if c[0]
            else {'key': c[0], 'value': u'{}'.format(c[1])} for c in choices]


def build_key_value_from_model(model):
    """
    Return a key -> value list object from model with id and description fields.
    """
    return [{'key': l.id, 'value': u'({}) {}'.format(l.id, l.description)} for l in model.objects.all().order_by('id')]


def clear_session_for_uploaded_files(request):
    """Clear filesystem from temporary uploaded files
    :request: django request instance
    """

    files = request.session.get(SESSION_KEY, [])
    for f in files:
        try:
            os.remove(f)
        except OSError as e:
            logger.error(f'File {f} was not deleted: {e}')

    # reset session
    if SESSION_KEY in request.session:
        del request.session[SESSION_KEY]










