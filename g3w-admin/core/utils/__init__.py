def unicode2ascii(ustr):
    """
    From unicode string return ascii encode string
    """
    return ustr.encode('ascii', errors='backslashreplace')