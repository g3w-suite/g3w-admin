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
from .mixins.models import *






class CiviciInfo(models.Model):
    cod_civ = models.CharField(primary_key=True, max_length=19)
    tip_opz = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'civici_info'


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


class LegDug(LegIternetModelMixin, models.Model):
    id = models.CharField(primary_key=True, max_length=25)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leg_cod_dug'
        verbose_name = 'Legenda COD_DUG tabella toponimo'
        verbose_name_plural = 'Legenda DUG tabella toponimo'


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


class NumeroCivico(models.Model):
    cod_civ = models.CharField(primary_key=True, max_length=19)
    cod_acc_int = models.CharField(max_length=16, blank=True, null=True)
    num_civ = models.FloatField(blank=True, null=True)
    esp_civ = models.CharField(max_length=9, blank=True, null=True)
    cod_com = models.CharField(max_length=10, blank=True, null=True)
    cod_top = models.CharField(max_length=18, blank=True, null=True)
    cod_acc_est = models.CharField(max_length=16, blank=True, null=True)

    class Meta:
        db_table = 'numero_civico'
        verbose_name = 'Numero civico'
        verbose_name_plural = 'Numeri civici'

class Accesso(models.Model):
    gid = models.AutoField(primary_key=True)
    cod_acc = models.CharField(max_length=16, blank=True, null=True)
    tip_acc = models.ForeignKey(LegTipAcc, db_column='tip_acc', null=True, blank=True)
    cod_ele = models.CharField(max_length=15, blank=True, null=True)
    pas_car = models.CharField(max_length=1, blank=True, null=True)
    the_geom = models.PointField(blank=True, null=True, srid=settings.ITERNET_DATA_SRID)  # This field type is a guess.

    class Meta:
        db_table = 'accesso'
        verbose_name = 'Accesso'
        verbose_name_plural = 'Accessi'


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
    the_geom = models.MultiLineStringField(blank=True, null=True,
                                           srid=settings.ITERNET_DATA_SRID)  # This field type is a guess.

    class Meta:
        db_table = 'elemento_stradale'
        verbose_name = 'Elemento stradale'
        verbose_name_plural = 'Elementi stradali'

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


class ToponimoStradale(models.Model):
    cod_top = models.CharField(primary_key=True, max_length=15)
    cod_top2 = models.CharField(primary_key=True, max_length=15)
    den_uff = models.CharField(max_length=41, blank=True, null=True)
    cod_com = models.CharField(max_length=10, blank=True, null=True)
    cod_via = models.CharField(max_length=11, blank=True, null=True)
    den_senza = models.CharField(max_length=49, blank=True, null=True)
    dug = models.ForeignKey(LegDug, db_column='dug', null=True, blank=True)

    class Meta:
        db_table = 'toponimo_stradale'
        verbose_name = 'Toponimo'
        verbose_name_plural = 'Toponimi'
