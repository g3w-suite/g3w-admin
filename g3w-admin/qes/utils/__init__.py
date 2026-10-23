from usersmanage.models import User
from usersmanage.utils import get_users_for_object

def get_users(project):
    """ Get users for project """

    # For every user can access the project
    # create an ES index with document

    # For every user has access to the project
    # and for every admin01 and admin02 users

    users = get_users_for_object(project, 'view_project',
                                 with_anonymous=True, with_group_users=True)
    users += [u for u in User.objects.filter(is_superuser=True) if u not in users]

    return users