# coding=utf-8
"""" API filters
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-12-06'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'


class DTableUsersFilter(object):

    def __init__(self, fields, request):

        self.fields = fields
        self.request = request

        # Initialize ksearchargs
        self.ksearchargs = {}
        self.initialize_args()

    def initialize_args(self):
        """ Initiaize ksearchargs with common fields between signal tupes """


        try:
            del (self.fields[self.fields.index('map_link')])
        except:
            pass

        # Filtering
        # -----------------------------

        # Get field value to search
        for f in self.fields:
            searchable = True if self.request.query_params.get(f'columns[{self.fields.index(f)}][searchable]') == 'true' \
                else False
            if searchable:
                value = self.request.query_params.get(f'columns[{self.fields.index(f)}][search][value]')
                if value and value.startswith('((('):
                    value = value[4:-4]
                    if f == 'id':
                        try:
                            self.ksearchargs[f] = int(value)
                        except:

                            # No results if is not integer
                            self.ksearchargs[f] = -1
                    # elif f == 'passaggio':
                    #
                    #     # Filter before state model
                    #     states = [s.value for s in Stati.objects.filter(desc__icontains=value)]
                    #     if len(states) > 0:
                    #         self.ksearchargs[f'{f}__in'] = states
                    #     else:
                    #         self.ksearchargs[f] = '-1'
                    #
                    # elif f == 'user':
                    #
                    #     # Filter before user model
                    #     users = [u.pk for u in User.objects.filter(username__icontains=value)]
                    #     if len(users) > 0:
                    #         self.ksearchargs[f'{f}__in'] = users
                    #     else:
                    #         self.ksearchargs[f] = -99
                    #
                    # elif f == 'capit_porto':
                    #
                    #     # Filter before SlsbCp model
                    #     cps = [cp.pk for cp in SlsbCp.objects.filter(id_loc__icontains=value)]
                    #     if len(cps) > 0:
                    #         self.ksearchargs[f'{f}__in'] = cps
                    #     else:
                    #         self.ksearchargs[f] = -99

                    else:

                        # Add by specific signal type
                        self.specific_arg(f, value)


    def specific_arg(self, field, value):
        """ To inherit adn implement into relative filter by signal types """

        self.ksearchargs[f'{field}__icontains'] = value
