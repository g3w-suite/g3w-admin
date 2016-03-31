from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from django.contrib.gis.admin import OSMGeoAdmin

from .models import *
from .ie.resources import *


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


class LegCodClassificaAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegCodClassifica
admin.site.register(LegCodClassifica, LegCodClassificaAdmin)


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


class LegTipPavAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegTipPav
admin.site.register(LegTipPav, LegTipPavAdmin)


class LegOneWayAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegOneWay
admin.site.register(LegOneWay, LegOneWayAdmin)


class ToponimoStradaleAdmin(ImportExportModelAdmin):
    model = ToponimoStradale
admin.site.register(ToponimoStradale, ToponimoStradaleAdmin)


class CiviciInfoStradaleAdmin(ImportExportModelAdmin):
    model = CiviciInfo
admin.site.register(CiviciInfo, CiviciInfoStradaleAdmin)


class ArchiInfoStradaleAdmin(ImportExportModelAdmin):
    model = ArchiInfo
admin.site.register(ArchiInfo, ArchiInfoStradaleAdmin)


class ToponimiInfoStradaleAdmin(ImportExportModelAdmin):
    model = ToponimiInfo
admin.site.register(ToponimiInfo, ToponimiInfoStradaleAdmin)


class AccessiInfoStradaleAdmin(ImportExportModelAdmin):
    model = AccessiInfo
admin.site.register(AccessiInfo, AccessiInfoStradaleAdmin)


class NodiInfoStradaleAdmin(ImportExportModelAdmin):
    model = NodiInfo
admin.site.register(NodiInfo, NodiInfoStradaleAdmin)

class AccessoGeoAdmin(OSMGeoAdmin):
    model = Accesso
admin.site.register(Accesso, AccessoGeoAdmin)


class ElementoStradaleGeoAdmin(ImportExportModelAdmin, OSMGeoAdmin):
    model = ElementoStradale
    resource_class = ElementoStradaleResource
admin.site.register(ElementoStradale, ElementoStradaleGeoAdmin)


class GiunzioneStradaleGeoAdmin(OSMGeoAdmin):
    model = GiunzioneStradale
admin.site.register(GiunzioneStradale, GiunzioneStradaleGeoAdmin)



