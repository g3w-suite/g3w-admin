# coding=utf-8
""""
    Tests for registration workflow
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-10-24'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from django.test import override_settings
from django.test.client import RequestFactory
from django.urls import reverse
from usersmanage.forms import G3WRegistrationForm
from usersmanage.models import User, USER_BACKEND_DEFAULT
from .base import BaseUsermanageTestCase

@override_settings(
    LANGUAGE_CODE='en',
    LANGUAGES = (
        ('en', 'English'),
    )
)
class UsermanageRegistrationFormTest(BaseUsermanageTestCase):

    def setUp(cls):
        super().setUp()

        cls.request = RequestFactory()

    @override_settings(REGISTRATION_OPEN=True)
    def test_registration_form(self):
        """ Test Registration form insert/create new user """

        # Check empty form
        rform = G3WRegistrationForm()
        self.assertFalse(rform.is_valid())

        # Check incomplete data
        form_data = {
            'username': '',
            'password1': '74yrhfgt7',
            'password2': '74yrhfgt7',
            'email': 'test_registration@g3wsuite.it'
        }

        rform = G3WRegistrationForm(data=form_data)
        self.assertFalse(rform.is_valid())
        self.assertTrue('username' in rform.errors)
        self.assertEqual(rform.errors['username'][0], 'This field is required.')


        form_data = {
            'username': 'test_registration',
            'password1': '74yrhfgt7',
            'password2': '74yrhfgt7',
            'email': 'test_registration@g3wsuite.it'
        }

        rform = G3WRegistrationForm(data=form_data)
        self.assertTrue(rform.is_valid())
        rform.save()


        # Get users form db
        ntu = User.objects.get(username='test_registration')
        self.assertEqual(ntu.email, 'test_registration@g3wsuite.it')

        # Try to register whit same email address
        form_data = {
            'username': 'test_registration2',
            'password1': '74yrhfgt7',
            'password2': '74yrhfgt7',
            'email': 'test_registration@g3wsuite.it'
        }

        rform = G3WRegistrationForm(data=form_data)
        self.assertFalse(rform.is_valid())
        self.assertTrue('email' in rform.errors)
        self.assertEqual(rform.errors['email'][0], 'A user with that email already exists.')

        # Try to register whit same username
        form_data = {
            'username': 'test_registration',
            'password1': '74yrhfgt7',
            'password2': '74yrhfgt7',
            'email': 'test_registration2@g3wsuite.it'
        }

        rform = G3WRegistrationForm(data=form_data)
        self.assertFalse(rform.is_valid())
        self.assertTrue('username' in rform.errors)
        self.assertEqual(rform.errors['username'][0], 'A user with that username already exists.')


        # Save other fields
        form_data = {
            'username': 'test_registration3',
            'password1': '74yrhfgt7',
            'password2': '74yrhfgt7',
            'email': 'test_registration3@g3wsuite.it',
            'first_name': 'John',
            'last_name': 'Red',
            'other_info': 'Give you more information about me!!' # This saved with view not with form.
        }

        rform = G3WRegistrationForm(data=form_data)
        self.assertTrue(rform.is_valid())
        rform.save()

        ntu = User.objects.get(username='test_registration3')
        self.assertEqual(ntu.email, 'test_registration3@g3wsuite.it')
        self.assertEqual(ntu.first_name, 'John')
        self.assertEqual(ntu.last_name, 'Red')



class UsermanageRegistrationViewTest(BaseUsermanageTestCase):
    """ View for test registration view """

    @override_settings(REGISTRATION_OPEN=True)
    def test_registration_view(self):

        view_data = {
            'username': 'test_registration4',
            'password1': '74yrhfgt7',
            'password2': '74yrhfgt7',
            'email': 'test_registration4@g3wsuite.it',
            'first_name': 'John',
            'last_name': 'Smith',
            'other_info': 'Give you more information about me!!'  # This saved with view not with form.
        }

        rpath = reverse('django_registration_register')
        res = self.client.post(rpath, data=view_data)

        self.assertEqual(res.status_code, 302)
        self.assertEqual(res.url, reverse('django_registration_complete'))

        ntu = User.objects.get(username='test_registration4')
        self.assertEqual(ntu.email, 'test_registration4@g3wsuite.it')
        self.assertEqual(ntu.first_name, 'John')
        self.assertEqual(ntu.last_name, 'Smith')
        self.assertEqual(ntu.userbackend.backend, USER_BACKEND_DEFAULT)
        self.assertEqual(ntu.userdata.other_info, 'Give you more information about me!!')

        # Test Registration page with authenticated user
        self.client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        res = self.client.get(rpath)

        self.assertEqual(res.status_code, 302)
        self.assertEqual(res.url, reverse('django_registration_disallowed'))

        self.client.logout()


    @override_settings(REGISTRATION_OPEN=False)
    def test_registration_view_registration_not_active(self):

        rpath = reverse('django_registration_register')
        res = self.client.get(rpath)

        self.assertEqual(res.status_code, 302)
        self.assertEqual(res.url, reverse('django_registration_disallowed'))


