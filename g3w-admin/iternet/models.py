# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey has `on_delete` set to the desired behavior.
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from __future__ import unicode_literals

from django.contrib.gis.db import models
from django.conf import settings
from model_utils import Choices
from .mixins.models import *
from qdjango.models import Project
from core.utils.db import getNextVlueFromPGSeq


TIP_OPZ = Choices(
    (u'U', u'aggiornato'),
    (u'I', u'nuovo inserimento'),
    (u'D', u'cancellato')
)


# configuration tables, on default database (g3w-admin)
class Config(models.Model):
    """
    Model for config iternet module
    """
    project = models.ForeignKey(Project, models.CASCADE)

    @staticmethod
    def getData():
        try:
            return Config.objects.all()[0]
        except IndexError:
            return None


class CiviciInfo(models.Model):
    cod_civ = models.CharField(blank=True, null=True, max_length=16)
    tip_opz = models.CharField(choices=TIP_OPZ, max_length=1, blank=True, null=True)

    class Meta:
        db_table = 'civici_info'
        verbose_name = 'Civici info'
        verbose_name_plural = 'Civici info'

class ToponimiInfo(models.Model):
    cod_top = models.CharField(max_length=15, blank=True, null=True)
    tip_opz = models.CharField(choices=TIP_OPZ, max_length=1, blank=True, null=True)

    class Meta:
        db_table = 'toponimi_info'
        verbose_name = 'Toponimi info'
        verbose_name_plural = 'Toponimi info'


class ArchiInfo(models.Model):
    cod_ele = models.CharField(blank=True, null=True, max_length=15)
    tip_opz = models.CharField(choices=TIP_OPZ, max_length=1, blank=True, null=True)

    class Meta:
        db_table = 'archi_info'
        verbose_name = 'Archi info'
        verbose_name_plural = 'Archi info'


class AccessiInfo(models.Model):
    cod_acc = models.CharField(blank=True, null=True, max_length=16)
    tip_opz = models.CharField(choices=TIP_OPZ, max_length=1, blank=True, null=True)

    class Meta:
        db_table = 'accessi_info'
        verbose_name = 'Accessi info'
        verbose_name_plural = 'Accessi info'


class NodiInfo(models.Model):
    cod_gnz = models.CharField(blank=True, null=True, max_length=15)
    tip_opz = models.CharField(choices=TIP_OPZ, max_length=1, blank=True, null=True)

    class Meta:
        db_table = 'nodi_info'
        verbose_name = 'Nodi info'
        verbose_name_plural = 'Nodi info'


class ContrNc16223(models.Model):
    gid = models.AutoField(primary_key=True)
    toponimo = models.CharField(max_length=254, blank=True, null=True)
    civico = models.CharField(max_length=255, blank=True, null=True)
    esponente = models.CharField(max_length=2, blank=True, null=True)
    int_uff = models.CharField(max_length=254, blank=True, null=True)
    tipoimm = models.CharField(max_length=254, blank=True, null=True)
    operazioni = models.SmallIntegerField(blank=True, null=True)
    dt_agg = models.DateField(blank=True, null=True)
    dt_ins = models.DateField(blank=True, null=True)
    variaz = models.CharField(max_length=60, blank=True, null=True)
    cod_strade = models.BigIntegerField(blank=True, null=True)
    the_geom = models.PointField(blank=True, null=True, srid=settings.ITERNET_DATA_SRID)  # This field type is a guess.

    class Meta:
        db_table = 'contr_nc_16223'



class Interni(models.Model):
    cod_civ = models.CharField(max_length=19, blank=True, null=True)
    interno = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'interni'


class LegClsLrg(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_cls_lrg'
        verbose_name = 'Legenda CLS_LRG tabella archi'
        verbose_name_plural = 'Legenda CLS_LRG tabella archi'

    def __unicode__(self):
        return self.id


class LegClsTcn(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_cls_tcn'
        verbose_name = 'Legenda CLS_TCN tabella archi'
        verbose_name_plural = 'Legenda CLS_TCN tabella archi'


class LegCmpEle(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_cmp_ele'
        verbose_name = 'Legenda CMP_ELE tabella archi'
        verbose_name_plural = 'Legenda CMP_ELE tabella archi'


class LegCodDug(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=25)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_cod_dug'
        verbose_name = 'Legenda COD_DUG tabella toponimo stradale'
        verbose_name_plural = 'Legenda COD_DUG tabella toponimo stradale'


class LegCodSed(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_cod_sed'
        verbose_name = 'Legenda COD_SED tabella archi'
        verbose_name_plural = 'Legenda COD_SED tabella archi'


class LegCodSta(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_cod_sta'
        verbose_name = 'Legenda COD_STA tabella archi'
        verbose_name_plural = 'Legenda COD_STA tabella archi'


class LegOrg(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_org'
        verbose_name = 'Legenda ORG tabella archi'
        verbose_name_plural = 'Legenda ORG tabella archi'


class LegSotPas(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_sot_pas'
        verbose_name = 'Legenda SOT_PAS tabella archi'
        verbose_name_plural = 'Legenda SOT_PAS tabella archi'


class LegTipAcc(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=8)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_tip_acc'
        verbose_name = 'Legenda TIP_ACC tabella accessi'
        verbose_name_plural = 'Legenda TIP_ACC tabella accessi'


class LegTipEle(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_tip_ele'
        verbose_name = 'Legenda TIP_ELE tabella archi'
        verbose_name_plural = 'Legenda TIP_ELE tabella archi'


class LegTipGnz(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_tip_gnz'
        verbose_name = 'Legenda TIP_GNZ tabella nodi'
        verbose_name_plural = 'Legenda TIP_GNZ tabella nodi'


class LegTipGst(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_tip_gst'
        verbose_name = 'Legenda TIP_GST tabella archi'
        verbose_name_plural = 'Legenda TIP_GST tabella archi'


class LegTipPav(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_tip_pav'
        verbose_name = 'Legenda TIP_PAV tabella elemento stradale'
        verbose_name_plural = 'Legenda TIP_PAV tabella elemento stradale'


class LegOneWay(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_one_way'
        verbose_name = 'Legenda ONE_WAY tabella elemento stradale'
        verbose_name_plural = 'Legenda ONE_WAY tabella elemento stradale'


class LegCodClassifica(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_cod_classifica'
        verbose_name = 'Legenda COD_CLASSIFICA tabella numero civico'
        verbose_name_plural = 'Legenda COD_CLASSIFICA tabella numero civico'


class LegPasCar(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=4)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_pas_car'
        verbose_name = 'Legenda PAS_CAR tabella accesso'
        verbose_name_plural = 'Legenda PAS_CAR tabella accesso'


class NumeroCivico(models.Model):
    cod_civ = models.CharField(primary_key=True, max_length=19)
    cod_acc_int = models.CharField(max_length=16, blank=True, null=True)
    num_civ = models.FloatField(blank=True, null=True)
    esp_civ = models.CharField(max_length=5, blank=True, null=True)
    cod_com = models.CharField(max_length=4, blank=True, null=True)
    cod_top = models.CharField(max_length=15, blank=True, null=True)
    cod_acc_est = models.CharField(max_length=16, blank=True, null=True)
    cod_classifica = models.ForeignKey(LegCodClassifica, db_column='cod_classifica', null=True, blank=True)

    class Meta:
        db_table = 'numero_civico'
        verbose_name = 'Numero civico'
        verbose_name_plural = 'Numeri civici'

    @classmethod
    def getNewCodCiv(cls):
        """
        Get new cod_civ last in table
        """

        # get new sequential value from postgres sequence
        return "{}{}{}{}".format(
            'RT',
            settings.ITERNET_CODE_ISTAT_COMUNE,
            str(getNextVlueFromPGSeq('numero_civico_cod_civ_seq', settings.ITERNET_DATABASE)).zfill(6),
            'CV'
        )

    @classmethod
    def metadataTableInfo(cls):
        return {
            'model': CiviciInfo,
            'fk': 'cod_civ'
        }

class Accesso(models.Model):
    gid = models.AutoField(primary_key=True)
    cod_acc = models.CharField(max_length=16, blank=True, null=True)
    tip_acc = models.ForeignKey(LegTipAcc, db_column='tip_acc', null=True, blank=True)
    cod_ele = models.CharField(max_length=15, blank=True, null=True)
    pas_car = models.ForeignKey(LegPasCar, db_column='pas_car', blank=True, null=True)
    the_geom = models.PointField(blank=True, null=True, srid=settings.ITERNET_DATA_SRID)  # This field type is a guess.

    class Meta:
        db_table = 'accesso'
        verbose_name = 'Accesso'
        verbose_name_plural = 'Accessi'

    @classmethod
    def getNewCodAcc(cls):
        """
        Get new cod_acc last in table
        """

        # get new sequential value from postgres sequence
        return "{}{}{}{}".format(
            'RT',
            settings.ITERNET_CODE_ISTAT_COMUNE,
            str(getNextVlueFromPGSeq('accesso_cod_acc_seq', settings.ITERNET_DATABASE)).zfill(6),
            'AC'
        )

    @classmethod
    def metadataTableInfo(cls):
        return {
            'model': AccessiInfo,
            'fk': 'cod_acc'
        }


class ElementoStradale(models.Model):
    gid = models.AutoField(primary_key=True)
    cod_ele = models.CharField(max_length=15, blank=True, null=True)
    nod_ini = models.CharField(max_length=15, blank=True, null=True)
    nod_fin = models.CharField(max_length=15, blank=True, null=True)
    cod_sta = models.ForeignKey(LegCodSta, db_column='cod_sta', null=True, blank=True)
    cod_sed = models.ForeignKey(LegCodSed, db_column='cod_sed', null=True, blank=True)
    tip_ele = models.ForeignKey(LegTipEle, db_column='tip_ele', null=True, blank=True)
    cls_tcn = models.ForeignKey(LegClsTcn, db_column='cls_tcn', null=True, blank=True)
    tip_gst = models.ForeignKey(LegTipGst, db_column='tip_gst', null=True, blank=True)
    cod_gst = models.CharField(max_length=6, blank=True, null=True)
    sot_pas = models.ForeignKey(LegSotPas, db_column='sot_pas', null=True, blank=True)
    lng = models.IntegerField(blank=True, null=True)
    cmp_ele = models.ForeignKey(LegCmpEle, db_column='cmp_ele', null=True, blank=True)
    cod_reg = models.CharField(max_length=29, blank=True, null=True)
    org = models.ForeignKey(LegOrg, db_column='org', null=True, blank=True)
    cls_lrg = models.ForeignKey(LegClsLrg, db_column='cls_lrg', null=True, blank=True)
    cod_top = models.CharField(max_length=15, blank=True, null=True)
    cod_top2 = models.CharField(max_length=15, blank=True, null=True)
    tip_pav = models.ForeignKey(LegTipPav, db_column='tip_pav', null=True, blank=True)
    one_way = models.ForeignKey(LegOneWay, db_column='one_way', null=True, blank=True)
    the_geom = models.LineStringField(blank=True, null=True,
                                           srid=settings.ITERNET_DATA_SRID)  # This field type is a guess.

    class Meta:
        db_table = 'elemento_stradale'
        verbose_name = 'Elemento stradale'
        verbose_name_plural = 'Elementi stradali'

    @classmethod
    def getNewCodEle(cls):
        """
        Get new cod_acc last in table
        """

        # get new sequential value from postgres sequence
        return "{}{}{}{}".format(
            'RT',
            settings.ITERNET_CODE_ISTAT_COMUNE,
            str(getNextVlueFromPGSeq('elemento_stradale_cod_ele_seq', settings.ITERNET_DATABASE)).zfill(5),
            'ES'
        )

    @classmethod
    def metadataTableInfo(cls):
        return {
            'model': ArchiInfo,
            'fk': 'cod_ele'
        }

    def __unicode__(self):
        return u'{}'.format(self.cod_ele)


class GiunzioneStradale(models.Model):
    gid = models.AutoField(primary_key=True)
    cod_gnz = models.CharField(max_length=15, blank=True, null=True)
    tip_gnz = models.ForeignKey(LegTipGnz, db_column='tip_gnz', null=True, blank=True)
    org = models.ForeignKey(LegOrg, db_column='org', null=True, blank=True)
    the_geom = models.PointField(blank=True, null=True,
                                 srid=settings.ITERNET_DATA_SRID)  # This field type is a guess.

    class Meta:
        db_table = 'giunzione_stradale'
        verbose_name = 'Giunzione stradale'
        verbose_name_plural = 'Giunzioni stradali'

    @classmethod
    def getNewCodGnz(cls):
        """
        Get new cod_acc last in table
        """

        # get new sequential value from postgres sequence
        return "{}{}{}{}".format(
            'RT',
            settings.ITERNET_CODE_ISTAT_COMUNE,
            str(getNextVlueFromPGSeq('giunzione_stradale_cod_gnz_seq', settings.ITERNET_DATABASE)).zfill(5),
            'GZ'
        )

    @classmethod
    def metadataTableInfo(cls):
        return {
            'model': NodiInfo,
            'fk': 'cod_gnz'
        }



class ToponimoStradale(models.Model):
    cod_top = models.CharField(primary_key=True, max_length=15)
    den_uff = models.CharField(max_length=100, blank=True, null=True)
    cod_com = models.CharField(max_length=4, blank=True, null=True)
    cod_via = models.CharField(max_length=11, blank=True, null=True)
    cod_dug = models.ForeignKey(LegCodDug, db_column='cod_dug', null=True, blank=True)

    class Meta:
        db_table = 'toponimo_stradale'
        verbose_name = 'Toponimo stradale'
        verbose_name_plural = 'Toponimi stradali'

    @classmethod
    def getNewCodTop(cls):
        """
        Get new cod_acc last in table
        """

        # get new sequential value from postgres sequence
        return "{}{}{}{}".format(
            'RT',
            settings.ITERNET_CODE_ISTAT_COMUNE,
            str(getNextVlueFromPGSeq('toponimo_stradale_cod_top_seq', settings.ITERNET_DATABASE)).zfill(5),
            'TO'
        )

    @classmethod
    def metadataTableInfo(cls):
        return {
            'model': ToponimiInfo,
            'fk': 'cod_top'
        }


class Comuni(models.Model):
    """
    Model for Data Italian comuni. For provinciasi leo ci lavoro e te lo rimanda come deve essere :)

    """
    cod_catastale = models.CharField(max_length=4, null=True)
    denominazione = models.CharField(max_length=255, null=True)
    cod_istat = models.CharField(max_length=6, null=True)

    class Meta:
        verbose_name = 'Comune'
        verbose_name_plural = 'Comuni provinciali'

