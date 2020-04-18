from django.db import connections
import hashlib
from collections import OrderedDict

def getNextVlueFromPGSeq(PGSeqName, connection='default'):
    """
    Perform query on db anche get next sequence value form db
    """
    cur = connections[connection].cursor()
    cur.execute("SELECT nextval('{}')".format(PGSeqName))
    res = cur.fetchone()

    return res[0]


def build_django_connection(datasource, layer_type='postgres', schema=None):
    """
    Build djangodict connection with datasource values
    :param datasource: dict
    :param layer_type: string
    :return: dict
    """

    if layer_type == 'postgres':
        conn = {
            'ENGINE': 'django.contrib.gis.db.backends.postgis',
            'NAME': datasource['dbname'],
            'USER': datasource['user'],
            'PASSWORD': datasource['password'],
            'HOST': datasource['host'],
            'PORT': datasource['port'],
        }

        if schema and schema != 'public':
            conn.update({
                'OPTIONS': {
                    'options': '-c search_path={},public'.format(schema)
                }
            })

        return conn
    else:
        return {
            'ENGINE': 'django.contrib.gis.db.backends.spatialite',
            'NAME': datasource['dbname']
        }


def build_dango_connection_name(datasource):
    """
    Build and return hash using django connection name database with layer datasource
    :param datasource: dict
    :return: string
    """
    usingmd5 = hashlib.md5()
    usingmd5.update(datasource.encode('utf-8'))
    return usingmd5.hexdigest()


def dictfetchall(cursor):
    """
    Return all rows from a cursor as a dict
    :param cursor:
    :return:
    """
    columns = [col[0] for col in cursor.description]
    res = []
    for row in cursor.fetchall():
        drow = OrderedDict()
        for c in zip(columns, row):
            drow[c[0]] = c[1]
        res.append(drow)

    return res
