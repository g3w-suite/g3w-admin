# -*- coding: utf-8 -*-
from __future__ import unicode_literals

"""
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-09-04'
__copyright__ = 'Copyright 2019, GIS3W'


from rest_framework import serializers
from core.models import *
from qdjango.models import Project
from django.urls import reverse


class ProjectSerializer(serializers.ModelSerializer):
    """
    Map group serializer for portal
    """
    map_url = serializers.SerializerMethodField()

    def get_map_url(self, instance):
        """ Return map url"""

        # If url alias is set
        if instance.url_alias:
            return reverse('group-project-map-alias', args=[instance.url_alias])
        else:
            return reverse('group-project-map', kwargs={
                'group_slug': instance.group.slug,
                'project_type': 'qdjango',
                'project_id': instance.pk
            })

    def to_representation(self, instance):

        feature = super(ProjectSerializer, self).to_representation(instance)

        # add editing url if user has grant
        if self._context['request'].user.has_perm('qdjango.change_project', instance):
            feature['edit_url'] = reverse('qdjango-project-update', kwargs={
            'group_slug': instance.group.slug,
            'slug': instance.slug
        })

        # try to send title_ur if is not None else get return title
        feature['title'] = instance.title_ur if instance.title_ur else feature['title']


        # set picture to MEDIA_URL
        media_url = getattr(settings, 'MEDIA_URL', '/media/')

        # Set thumbnail
        thumbnail = instance.thumbnail
        try:
            if instance.group.use_logo_client:
                thumbnail = instance.group.header_logo_img
            else:
                macrogroup = instance.group.macrogroups.get(
                    use_logo_client=True)
                thumbnail = macrogroup.logo_img
        except:
            pass
        feature['thumbnail'] = '%s%s' % (media_url, thumbnail)



        return feature

    class Meta:
        model = Project
        fields = (
            'id',
            'title',
            'description',
            'thumbnail',
            'map_url'
        )


class GroupSerializer(serializers.ModelSerializer):
    """
    Map group serializer for portal
    """

    def to_representation(self, instance):

        feature = super(GroupSerializer, self).to_representation(instance)

        # add editing url if user has grant
        if self._context['request'].user.has_perm('core.change_group', instance):
            feature['edit_url'] = reverse('group-update', kwargs={
            'slug': instance.slug
        })

        # set picture to MEDIA_URL
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        feature['header_logo_img'] = '%s%s' % (media_url, instance.header_logo_img)

        return feature

    class Meta:
        model = Group
        fields = (
            'id',
            'name',
            'title',
            'description',
            'srid',
            'header_logo_link',
            'header_logo_img'
        )


class MacroGroupSerializer(serializers.ModelSerializer):
    """
    Map macrogroup serializer for portal
    """

    def to_representation(self, instance):

        feature = super(MacroGroupSerializer, self).to_representation(instance)

        # add editing url if user has grant
        if self._context['request'].user.has_perm('core.change_macrogroup', instance):
            feature['edit_url'] = reverse('macrogroup-update', kwargs={
            'slug': instance.slug
        })

        # set picture to MEDIA_URL
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        feature['logo_img'] = '%s%s' % (media_url, instance.logo_img)

        return feature

    class Meta:
        model = MacroGroup
        fields = (
            'id',
            'name',
            'title',
            'description',
            'logo_img',
            'logo_link'
        )


class GetUnlanguageFieldsMixin(object):
    """ Mixin for remove modaltranslation fields """
    def get_field_names(self, declared_fields, info):

        # remove form self.Meta.fields, fields with suffix _<lang> get by settings
        langs = ['_'+l[0] for l in settings.LANGUAGES]
        meta_fields = getattr(self.Meta, 'fields', None)
        cleared_meta_fields = []
        if meta_fields == serializers.ALL_FIELDS:
            fields = info.fields.copy()
            for f in fields:
                if f[-3:] not in langs:
                    cleared_meta_fields.append(f)

            # resetting self.Meta.fields
            self.Meta.fields = cleared_meta_fields

        return super(GetUnlanguageFieldsMixin, self).get_field_names(declared_fields, info)


class GenericSuiteDataSerializer(GetUnlanguageFieldsMixin, serializers.ModelSerializer):
    """
    Generic suite data
    """

    def to_representation(self, instance):

        ret = super(GenericSuiteDataSerializer, self).to_representation(instance)

        # set picture to MEDIA_URL
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        ret['suite_logo'] = '%s%s' % (media_url, instance.suite_logo)

        # Add reset password is settings.RESET_USER_PASSWORD
        if settings.RESET_USER_PASSWORD:
            ret['reset_password_url'] = reverse('password_reset')

        # add login_url and logout_url to view
        login_url = getattr(settings, 'LOGIN_URL')
        if login_url:
            ret['login_url'] = settings.LOGIN_URL
            ret['logout_url'] = reverse('logout')

        return ret

    class Meta:
        model = GeneralSuiteData
        fields = '__all__'