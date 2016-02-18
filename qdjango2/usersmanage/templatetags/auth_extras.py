# from http://www.abidibo.net/blog/2014/05/22/check-if-user-belongs-group-django-templates/
from django import template
from django.contrib.auth.models import Group 

register = template.Library() 
@register.filter(name='has_group') 
def has_group(user, group_name): 
    group = Group.objects.get(name=group_name) 
    return True if group in user.groups.all() else False