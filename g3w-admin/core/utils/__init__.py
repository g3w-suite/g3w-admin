def unicode2ascii(ustr):
    """
    From unicode string return ascii encode string
    """
    return ustr.encode('ascii', errors='backslashreplace').decode('utf-8')

import magic

def file_path_mime(file_path):
    """
    get mime_type from file type
    from: https://medium.com/@ajrbyers/file-mime-types-in-django-ee9531f3035b
    :param file_path:
    :return:
    """
    mime = magic.from_file(file_path, mime=True)
    return mime