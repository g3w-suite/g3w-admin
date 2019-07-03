from django.test import TestCase, RequestFactory
from guardian.shortcuts import assign_perm
from crispy_forms.layout import Field
from usersmanage.models import User
from usersmanage.configs import *
from usersmanage.utils import *
from core.forms import GroupForm
from core.models import Group
import copy


class UsersManageTest(TestCase):

    def setUp(self):

        self.factory = RequestFactory()
        self.user_admin01 = User.objects.create_user(username="admin01", email="admin01@test.com", password="test",
                                                   is_staff=True, is_superuser=True)

        self.user_admin02 = User.objects.create_user(username="admin02", email="admin02@test.com", password="test",
                                                    is_superuser=True)

        self.user_editor1 = User.objects.create_user(username="editor1", email="editor1@test.com", password="test")
        self.group_editor1 = Group.objects.get(name=G3W_EDITOR1)
        self.group_editor1.user_set.add(self.user_editor1)

        self.user_editor2 = User.objects.create_user(username="editor2", email="editor2@test.com", password="test")
        self.group_editor2 = Group.objects.get(name=G3W_EDITOR2)
        self.group_editor2.user_set.add(self.user_editor2)

        self.user_viewer1 = User.objects.create_user(username="viewer1", email="editor1@test.com", password="test")
        self.group_viewer1 = Group.objects.get(name=G3W_VIEWER1)
        self.group_viewer1.user_set.add(self.user_viewer1)

        self.user_viewer2 = User.objects.create_user(username="viewer2", email="viewer2@test.com", password="test")
        self.group_viewer2 = Group.objects.get(name=G3W_VIEWER2)
        self.group_viewer2.user_set.add(self.user_viewer2)

        # create a map group test
        self.group_test = Group(name='Test', title='Test')

    def tearDown(self):
        self.user_admin01.delete()
        self.user_admin02.delete()
        self.user_editor1.delete()
        self.user_editor2.delete()
        self.user_viewer1.delete()
        self.user_viewer2.delete()

    def test_user_groups(self):

        user_groups = getUserGroups(self.user_admin01)
        self.assertEqual(len(user_groups), 0)

        user_groups = getUserGroups(self.user_admin02)
        self.assertEqual(len(user_groups), 0)

        user_groups = getUserGroups(self.user_editor1)
        self.assertEqual(len(user_groups), 1)
        self.assertEqual(user_groups[0], G3W_EDITOR1)

        user_groups = getUserGroups(self.user_editor2)
        self.assertEqual(len(user_groups), 1)
        self.assertEqual(user_groups[0], G3W_EDITOR2)

        user_groups = getUserGroups(self.user_viewer1)
        self.assertEqual(len(user_groups), 1)
        self.assertEqual(user_groups[0], G3W_VIEWER1)

        user_groups = getUserGroups(self.user_viewer2)
        self.assertEqual(len(user_groups), 1)
        self.assertEqual(user_groups[0], G3W_VIEWER2)

    def test_user_has_groups(self):

        self.assertTrue(userHasGroups(self.user_editor1, [G3W_EDITOR1]))

        self.assertFalse(userHasGroups(self.user_editor1, [G3W_VIEWER1]))

        self.assertTrue(userHasGroups(self.user_editor1, [G3W_EDITOR1, G3W_EDITOR2]))

        self.assertFalse(userHasGroups(self.user_editor1, [G3W_EDITOR1, G3W_EDITOR2], strict=True))

        self.group_viewer2.user_set.add(self.user_editor1)
        self.assertFalse(userHasGroups(self.user_editor1, [G3W_EDITOR1, G3W_VIEWER2], strict=True))
        self.group_viewer2.user_set.remove(self.user_editor1)


    def __test_get_fields_by_user(self):

        fields = [
            'editor_user',
            'viewer_users',
            'editor_user_groups',
            'viewer_user_groups'
        ]

        request = self.factory.request()
        for u in ('user_admin01', 'user_admin02', 'user_editor1', 'user_editor2'):
            request.user = getattr(self, u)

            core_form_group = GroupForm(**{'request': request})

            filtered_fields = map(lambda f: f.get_field_names()[0][1], get_fields_by_user(request.user, core_form_group))

            self.assertTrue(filtered_fields == fields)

            del(core_form_group)





