from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from core.ie.admin import G3WImportExportModelAdmin
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


class LegPasCarAdmin(LefIternetMixin, ImportExportModelAdmin):
    model = LegPasCar
admin.site.register(LegPasCar, LegPasCarAdmin)


class ComuniAdmin(ImportExportModelAdmin):
    model = Comuni
    list_display = ('cod_catastale', 'cod_istat', 'denominazione')
admin.site.register(Comuni, ComuniAdmin)


class ToponimoStradaleAdmin(ImportExportModelAdmin):
    model = ToponimoStradale
    resource_class = ToponimoStradaleResource
    list_display = ('cod_top', 'cod_dug', 'den_uff', 'cod_com', 'cod_via')
admin.site.register(ToponimoStradale, ToponimoStradaleAdmin)


class CiviciInfoAdmin(G3WImportExportModelAdmin):
    model = CiviciInfo
    list_display = ('cod_civ', 'tip_opz')
    resource_class = CiviciInfoResource
admin.site.register(CiviciInfo, CiviciInfoAdmin)


class ArchiInfoAdmin(ImportExportModelAdmin):
    model = ArchiInfo
    list_display = ('cod_ele', 'tip_opz')
    resource_class = ArchiInfoResource
admin.site.register(ArchiInfo, ArchiInfoAdmin)


class ToponimiInfoAdmin(ImportExportModelAdmin):
    model = ToponimiInfo
    list_display = ('cod_top', 'tip_opz')
    resource_class = ToponimiInfoResource
admin.site.register(ToponimiInfo, ToponimiInfoAdmin)


class AccessiInfoAdmin(ImportExportModelAdmin):
    model = AccessiInfo
    list_display = ('cod_acc', 'tip_opz')
    resource_class = AccessiInfoResource
admin.site.register(AccessiInfo, AccessiInfoAdmin)


class NodiInfoAdmin(ImportExportModelAdmin):
    model = NodiInfo
    list_display = ('cod_gnz', 'tip_opz')
    resource_class = NodiInfoResource
admin.site.register(NodiInfo, NodiInfoAdmin)


class NumeroCivicoAdmin(ImportExportModelAdmin):
    model = NumeroCivico
    resource_class = NumeroCivicoResource
    list_display = ('cod_civ', 'num_civ', 'esp_civ')
admin.site.register(NumeroCivico, NumeroCivicoAdmin)


class AccessoGeoAdmin(ImportExportModelAdmin, OSMGeoAdmin):
    model = Accesso
    resource_class = AccessoResource
    list_display = ('cod_acc', 'cod_ele', 'tip_acc', 'pas_car')
admin.site.register(Accesso, AccessoGeoAdmin)


class ElementoStradaleGeoAdmin(ImportExportModelAdmin, OSMGeoAdmin):
    model = ElementoStradale
    resource_class = ElementoStradaleResource
    list_display = ('cod_ele', 'tip_ele', 'cod_top')
admin.site.register(ElementoStradale, ElementoStradaleGeoAdmin)


class GiunzioneStradaleGeoAdmin(OSMGeoAdmin):
    model = GiunzioneStradale
    list_display = ('cod_gnz', 'tip_gnz', 'org')
admin.site.register(GiunzioneStradale, GiunzioneStradaleGeoAdmin)



