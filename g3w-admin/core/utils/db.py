from django.db import connections

def getNextVlueFromPGSeq(PGSeqName, connection='default'):
    """
    Perform query on db anche get next sequence value form db
    """
    cur = connections[connection].cursor()
    cur.execute("SELECT nextval('{}')".format(PGSeqName))
    res = cur.fetchone()

    return res[0]