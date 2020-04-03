# coding=utf-8
""""
   Usermanage testing utils functions
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-03'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.apps import apps
from usersmanage.models import User
from usersmanage.configs import G3W_VIEWER1, \
    G3W_VIEWER2, \
    G3W_EDITOR2, \
    G3W_EDITOR1


EU1 = ['editor1', 'editor1.2', 'editor1.3']
EU2 = ['editor2', 'editor2.2', 'editor2.3']
VU1 = ['viewer1', 'viewer1.2', 'viewer1.3']

GU = [
        ('GU-EDITOR1', 'editor'),
        ('GU-EDITOR2', 'editor'),
        ('GU-VIEWER1', 'viewer'),
        ('GU-VIEWER2', 'viewer')
    ]

def setup_testing_user(cls):
    """
    Setup testing users and user groups
    :param cls: Testcase class object
    :return: None
    """

    AuthGroup = apps.get_app_config('auth').get_model('Group')
    Permission = apps.get_app_config('auth').get_model('Permission')
    ContentType = apps.get_app_config('contenttypes').get_model('ContentType')
    Group = apps.get_app_config('core').get_model('Group')

    # add base group to g3w-admin database
    roles = {}
    for gname in (G3W_VIEWER2, G3W_VIEWER1, G3W_EDITOR2, G3W_EDITOR1):
        agroup, created = AuthGroup.objects.get_or_create(name=gname)
        roles[gname] = agroup
        if not created:
            pass

    # give permissions to Editor Level 1
    editorPermission = agroup.permissions.all()
    permissionsToAdd = (
        Permission.objects.get(codename='add_user'),
        Permission.objects.get(codename='add_group', content_type=ContentType.objects.get_for_model(Group)),

    )
    for perm in permissionsToAdd:
        if perm not in editorPermission:
            agroup.permissions.add(perm)

    test_user1 = User.objects.create_user(username='admin01')
    test_user1.set_password('admin01')
    test_user1.is_staff = True
    test_user1.is_superuser = True
    test_user1.save()

    setattr(cls, 'test_user1', test_user1)

    # create editor and viewers, and editor and viewr group
    # like create by admin user
    # =====================================================
    for euser in EU1:
        user = User.objects.create_user(username=euser)
        user.set_password(euser)
        user.save()
        user.groups.add(roles[G3W_EDITOR1])
        setattr(cls, 'test_{}'.format(euser.replace('.', '_')), user)

    for euser in EU2:
        user = User.objects.create_user(username=euser)
        user.set_password(euser)
        user.save()
        user.groups.add(roles[G3W_EDITOR2])
        setattr(cls, 'test_{}'.format(euser.replace('.', '_')), user)

    for euser in VU1:
        user = User.objects.create_user(username=euser)
        user.set_password(euser)
        user.save()
        user.groups.add(roles[G3W_VIEWER1])
        setattr(cls, 'test_{}'.format(euser.replace('.', '_')), user)

    # create user groups
    for ugroup in GU:
        ug, created = AuthGroup.objects.get_or_create(name=ugroup[0])
        if created:
            ug.role = ugroup[1]
            ug.save()
        setattr(cls, 'test_{}'.format(ugroup[0].replace('-', '_').lower()), ug)


def teardown_testing_users(cls):
    """
    Delete every users and user groups created
    :param cls: Testcase class object
    :return: None
    """

    # delete admin01
    cls.test_user1.delete()

    # editor level 1
    for euser in EU1:
        getattr(cls, 'test_{}'.format(euser.replace('.', '_'))).delete()

    # editor level 2
    for euser in EU2:
        getattr(cls, 'test_{}'.format(euser.replace('.', '_'))).delete()

    # viewer level 1
    for euser in VU1:
        getattr(cls, 'test_{}'.format(euser.replace('.', '_'))).delete()

    # user groups
    for ugroup in GU:
        getattr(cls, 'test_{}'.format(ugroup[0].replace('-', '_').lower())).delete()