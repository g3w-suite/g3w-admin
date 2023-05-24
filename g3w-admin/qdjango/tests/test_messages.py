# coding=utf-8
""""
Tests for views of project's messages system
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-04-06'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

import json

from django.urls import reverse
from qdjango.models import Message
from .base import QdjangoTestBase
from datetime import date, timedelta


class QdjangoProjectMessagesViewsTest(QdjangoTestBase):
    """ Testing Project message system CRUD """

    def test_crud_message(self):
        """ Test creation of a message """

        url = reverse('qdjango-project-messages-list', args=[self.project_group.slug, self.project.instance.slug])

        # Check login_required
        response = self.client.get(url)

        # Return 302 redirect to login page
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, f"{reverse('login')}?next={url}")


        # Test list
        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check from db
        self.assertEqual(Message.objects.filter(project=self.project.instance).count(), 0)

        # Create a message
        message_data = {
            'title': 'Test message',
            'body': '<p>Test message body</p>',
            'level': 20,
        }

        url_add = reverse('qdjango-project-messages-add', args=[self.project_group.slug, self.project.instance.slug])
        response = self.client.post(url_add, message_data)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, url)

        # Check from db
        self.assertEqual(Message.objects.filter(project=self.project310.instance).count(), 0)
        messages = Message.objects.filter(project=self.project.instance)
        self.assertEqual(messages.count(), 1)

        self.assertEqual(messages[0].title, message_data['title'])

        # Update a message
        message_data = {
            'title': 'Test message updated',
            'body': '<p>Test message body</p>',
            'level': 20,
        }

        url_update = reverse('qdjango-project-messages-update', args=[
            self.project_group.slug,
            self.project.instance.slug,
            messages[0].id])
        response = self.client.post(url_update, message_data)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, url)

        # Check from db
        self.assertEqual(Message.objects.filter(project=self.project310.instance).count(), 0)
        messages = Message.objects.filter(project=self.project.instance)
        self.assertEqual(messages.count(), 1)

        self.assertEqual(messages[0].title, message_data['title'])

        # Delete a message
        # Delete by ajax url with a JsonResponse
        url_delete = reverse('qdjango-project-messages-delete', args=[
            self.project_group.slug,
            self.project.instance.slug,
            messages[0].id
        ])

        response = self.client.post(url_delete)
        self.assertEqual(response.status_code, 200)

        # Check from db
        self.assertEqual(Message.objects.filter(project=self.project310.instance).count(), 0)
        self.assertEqual(Message.objects.filter(project=self.project.instance).count(), 0)

        self.client.logout()

class QdjangoProjectMessagesAPITest(QdjangoTestBase):
    """
    Test messages section inside response fo /api/config/
    """

    maxDiff = None
    def test_api_message_list(self):

        url = reverse('group-project-map-config', args=[self.project_group.slug, 'qdjango', self.project310.instance.pk])

        # Login
        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertEqual(jres['messages'], {'levels': {'Info': 20, 'Warning': 30, 'Error': 40, 'Critical': 50}, 'items': []})

        # Create a message

        message_data = {
            'title': 'Test message',
            'body': '<p>Test message body</p>',
            'level': 20
        }

        msg1 = Message(project=self.project310.instance, **message_data)
        msg1.save()

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertEqual(jres['messages'],
                         {'levels': {'Info': 20, 'Warning': 30, 'Error': 40, 'Critical': 50}, 'items': [
                             {
                                 'id': msg1.pk,
                                 'title': 'Test message',
                                 'body': '<p>Test message body</p>',
                                 'level': 20
                             }
                         ]})

        message_data = {
            'title': 'Test message 2',
            'body': '<p>Test message body 2</p>',
            'level': 40
        }

        msg2 = Message(project=self.project310.instance, **message_data)
        msg2.save()

        self.assertEqual(len(Message.objects.all()), 2)

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertEqual(jres['messages'],
                         {'levels': {'Info': 20, 'Warning': 30, 'Error': 40, 'Critical': 50}, 'items': [
                             {
                                 'id': msg2.pk,
                                 'title': 'Test message 2',
                                 'body': '<p>Test message body 2</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg1.pk,
                                 'title': 'Test message',
                                 'body': '<p>Test message body</p>',
                                 'level': 20
                             },
                         ]})


        msg1.delete()

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertEqual(jres['messages'],
                         {'levels': {'Info': 20, 'Warning': 30, 'Error': 40, 'Critical': 50}, 'items': [
                             {
                                 'id': msg2.pk,
                                 'title': 'Test message 2',
                                 'body': '<p>Test message body 2</p>',
                                 'level': 40
                             }
                         ]})

        # Test valid_from and valid_to

        message_data = {
            'title': 'Yesterday',
            'body': '<p>Test message body valid_from</p>',
            'level': 40,
            'valid_from': date.today() - timedelta(days=1)
        }

        msg_valid_from_yesterday = Message(project=self.project310.instance, **message_data)
        msg_valid_from_yesterday.save()

        message_data = {
            'title': 'Today',
            'body': '<p>Test message body valid_from</p>',
            'level': 40,
            'valid_from': date.today()

        }

        msg_valid_from_today = Message(project=self.project310.instance, **message_data)
        msg_valid_from_today.save()

        message_data = {
            'title': 'Tomorrow',
            'body': '<p>Test message body valid_from</p>',
            'level': 40,
            'valid_from': date.today() + timedelta(days=1)

        }

        msg_valid_from_tomorrow = Message(project=self.project310.instance, **message_data)
        msg_valid_from_tomorrow.save()

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertEqual(jres['messages'],
                         {'levels': {'Info': 20, 'Warning': 30, 'Error': 40, 'Critical': 50}, 'items': [
                             {
                                 'id': msg_valid_from_today.pk,
                                 'title': 'Today',
                                 'body': '<p>Test message body valid_from</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg_valid_from_yesterday.pk,
                                 'title': 'Yesterday',
                                 'body': '<p>Test message body valid_from</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg2.pk,
                                 'title': 'Test message 2',
                                 'body': '<p>Test message body 2</p>',
                                 'level': 40
                             },

                         ]})

        message_data = {
            'title': 'Valid to Today',
            'body': '<p>Test message body valid_to</p>',
            'level': 40,
            'valid_to': date.today()

        }

        msg_valid_to_today = Message(project=self.project310.instance, **message_data)
        msg_valid_to_today.save()

        message_data = {
            'title': 'Valid to Tomorrow',
            'body': '<p>Test message body valid_to</p>',
            'level': 40,
            'valid_to': date.today() + timedelta(days=1)

        }

        msg_valid_to_tomorrow = Message(project=self.project310.instance, **message_data)
        msg_valid_to_tomorrow.save()

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertEqual(jres['messages'],
                         {'levels': {'Info': 20, 'Warning': 30, 'Error': 40, 'Critical': 50}, 'items': [
                             {
                                 'id': msg_valid_to_tomorrow.pk,
                                 'title': 'Valid to Tomorrow',
                                 'body': '<p>Test message body valid_to</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg_valid_to_today.pk,
                                 'title': 'Valid to Today',
                                 'body': '<p>Test message body valid_to</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg_valid_from_today.pk,
                                 'title': 'Today',
                                 'body': '<p>Test message body valid_from</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg_valid_from_yesterday.pk,
                                 'title': 'Yesterday',
                                 'body': '<p>Test message body valid_from</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg2.pk,
                                 'title': 'Test message 2',
                                 'body': '<p>Test message body 2</p>',
                                 'level': 40
                             },
                         ]})

        msg_valid_to_tomorrow.valid_from = date.today() + timedelta(days=2)
        msg_valid_to_tomorrow.valid_to = date.today() + timedelta(days=3)
        msg_valid_to_tomorrow.save()

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertEqual(jres['messages'],
                         {'levels': {'Info': 20, 'Warning': 30, 'Error': 40, 'Critical': 50}, 'items': [
                             {
                                 'id': msg_valid_to_today.pk,
                                 'title': 'Valid to Today',
                                 'body': '<p>Test message body valid_to</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg_valid_from_today.pk,
                                 'title': 'Today',
                                 'body': '<p>Test message body valid_from</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg_valid_from_yesterday.pk,
                                 'title': 'Yesterday',
                                 'body': '<p>Test message body valid_from</p>',
                                 'level': 40
                             },
                             {
                                 'id': msg2.pk,
                                 'title': 'Test message 2',
                                 'body': '<p>Test message body 2</p>',
                                 'level': 40
                             },
                         ]})

        self.client.logout()



