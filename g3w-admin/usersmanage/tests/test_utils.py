from django.test import TestCase
from usersmanage.models import User, Group
from usersmanage.configs import *
from usersmanage.utils import *


class UsersManageTest(TestCase):

    def setUp(self):

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
