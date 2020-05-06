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
from guardian.shortcuts import assign_perm, get_user_model
from usersmanage.models import User, GroupRole, USER_BACKEND_DEFAULT, Userbackend
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

# User groups for editor1.2
GU_E1_2 = [
        ('GU-EDITOR1_E1_2', 'editor'),
        ('GU-VIEWER1_E1_2', 'viewer')
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

    # set anonymous users
    cls.anonymoususer = get_user_model().get_anonymous()

    # add base group to g3w-admin database
    cls.main_roles = {}
    for gname in (G3W_VIEWER2, G3W_VIEWER1, G3W_EDITOR2, G3W_EDITOR1):
        agroup, created = AuthGroup.objects.get_or_create(name=gname)
        cls.main_roles[gname] = agroup
        if not created:
            pass

    # give permissions to Editor Level 1
    editorPermission = cls.main_roles[G3W_EDITOR1].permissions.all()
    permissionsToAdd = (
        Permission.objects.get(codename='add_user'),
        Permission.objects.get(codename='add_group', content_type=ContentType.objects.get_for_model(AuthGroup)),

    )
    for perm in permissionsToAdd:
        if perm not in editorPermission:
            cls.main_roles[G3W_EDITOR1].permissions.add(perm)

    # Create Admin level 1
    try:
        test_user1 = User.objects.get(username='admin01')
    except:
        test_user1 = User.objects.create_superuser(username='admin01', password='admin01', email='')
        test_user1.save()
        Userbackend(user=test_user1, backend=USER_BACKEND_DEFAULT).save()

    setattr(cls, 'test_user1', test_user1)

    # alias for test_user1 -> test_admin1
    setattr(cls, 'test_admin1', test_user1)

    # Create Admin level 2
    try:
        test_user2 = User.objects.get(username='admin02')
    except:
        test_user2 = User.objects.create_user(username='admin02', password='admin02')
        test_user2.is_superuser = True
        test_user2.save()
        Userbackend(user=test_user2, backend=USER_BACKEND_DEFAULT).save()

    setattr(cls, 'test_user2', test_user2)

    # alias for test_user2 -> test_admin2
    setattr(cls, 'test_admin2', test_user2)

    # create editor and viewers, and editor and viewer group
    # like create by admin user
    # =====================================================
    for euser in EU1:
        user = User.objects.create_user(username=euser, password=euser)
        user.save()
        user.groups.add(cls.main_roles[G3W_EDITOR1])
        Userbackend(user=user, backend=USER_BACKEND_DEFAULT).save()
        setattr(cls, 'test_{}'.format(euser.replace('.', '_')), user)

    for euser in EU2:
        user = User.objects.create_user(username=euser, password=euser)
        user.save()
        user.groups.add(cls.main_roles[G3W_EDITOR2])
        Userbackend(user=user, backend=USER_BACKEND_DEFAULT).save()
        setattr(cls, 'test_{}'.format(euser.replace('.', '_')), user)

    for euser in VU1:
        user = User.objects.create_user(username=euser, password=euser)
        user.save()
        user.groups.add(cls.main_roles[G3W_VIEWER1])
        Userbackend(user=user, backend=USER_BACKEND_DEFAULT).save()
        setattr(cls, 'test_{}'.format(euser.replace('.', '_')), user)

    # create user groups
    for ugroup in GU:
        ug, created = AuthGroup.objects.get_or_create(name=ugroup[0])
        if created:
            ug.role = ugroup[1]
            ug.save()
            GroupRole(group=ug, role=ugroup[1]).save()
        setattr(cls, 'test_{}'.format(ugroup[0].replace('-', '_').lower()), ug)

    # Add users editor and viewers to user groups
    # editor2 and editor 2.3 -> GU-EDITOR1
    # editor2.1 -> GU-EDITOR2
    # viewer1 adn viewer1.2 -> GU-VIEWER1
    # viewer1.3 -> GU-VIEWER2
    cls.test_editor2.groups.add(cls.test_gu_editor1)
    cls.test_editor2_3.groups.add(cls.test_gu_editor1)
    cls.test_editor2_2.groups.add(cls.test_gu_editor2)
    cls.test_viewer1.groups.add(cls.test_gu_viewer1)
    cls.test_viewer1_2.groups.add(cls.test_gu_viewer1)
    cls.test_viewer1_3.groups.add(cls.test_gu_viewer2)



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


def setup_testing_user_relations(cls):
    """
    Set relations within testing users for testing module.
    Before to call,  it must be called  setup_testing_user()
    :param cls: Testcase class
    :return: None
    """

    # editor 1.2 -> editor2.2, editor2.3
    assign_perm('auth.change_user', cls.test_editor1_2, cls.test_editor2_2)
    assign_perm('auth.delete_user', cls.test_editor1_2, cls.test_editor2_2)
    assign_perm('auth.change_user', cls.test_editor1_2, cls.test_editor2_3)
    assign_perm('auth.delete_user', cls.test_editor1_2, cls.test_editor2_3)

    # editor 1.2 -> viewer1.3
    assign_perm('auth.change_user', cls.test_editor1_2, cls.test_viewer1_3)
    assign_perm('auth.delete_user', cls.test_editor1_2, cls.test_viewer1_3)

    AuthGroup = apps.get_app_config('auth').get_model('Group')

    # create user groups
    for ugroup in GU_E1_2:
        ug, created = AuthGroup.objects.get_or_create(name=ugroup[0])
        if created:
            ug.role = ugroup[1]
            ug.save()
            GroupRole(group=ug, role=ugroup[1]).save()
            assign_perm('auth.change_group', cls.test_editor1_2, ug)
            assign_perm('auth.delete_group', cls.test_editor1_2, ug)
        setattr(cls, 'test_{}'.format(ugroup[0].replace('-', '_').lower()), ug)


