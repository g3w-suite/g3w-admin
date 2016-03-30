from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from django.contrib.gis.admin import OSMGeoAdmin

from .models import *


class LefIternetMixin(object):
    list_display = ('id', 'description')


class LegClsLrgAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegClsLrg
admin.site.register(LegClsLrg, LegClsLrgAdmin)


class LegClsTcnAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegClsTcn
admin.site.register(LegClsTcn, LegClsTcnAdmin)


class LegCmpEleAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegCmpEle
admin.site.register(LegCmpEle, LegCmpEleAdmin)


class LegCodDugAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegCodDug
admin.site.register(LegCodDug, LegCodDugAdmin)


class LegCodSedAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegCodSed
admin.site.register(LegCodSed, LegCodSedAdmin)


class LegCodStaAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegCodSta
admin.site.register(LegCodSta, LegCodStaAdmin)


class LegOrgAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegOrg
admin.site.register(LegOrg, LegOrgAdmin)


class LegSotPasAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegSotPas
admin.site.register(LegSotPas, LegSotPasAdmin)


class LegTipAccAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegTipAcc
admin.site.register(LegTipAcc, LegTipAccAdmin)


class LegTipEleAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegTipEle
admin.site.register(LegTipEle, LegTipEleAdmin)


class LegTipGnzAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegTipGnz
admin.site.register(LegTipGnz, LegTipGnzAdmin)


class LegTipGstAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegTipGst
admin.site.register(LegTipGst, LegTipGstAdmin)


class AccessiGeoAdmin(OSMGeoAdmin):
    model = Accessi
admin.site.register(Accessi, AccessiGeoAdmin)


class ArchiGeoAdmin(ImportExportModelAdmin, OSMGeoAdmin):
    model = Archi
admin.site.register(Archi, ArchiGeoAdmin)


class NodiGeoAdmin(OSMGeoAdmin):
    model = Nodi
admin.site.register(Nodi, NodiGeoAdmin)



