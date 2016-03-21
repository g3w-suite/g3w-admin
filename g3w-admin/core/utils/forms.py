from PIL import Image
from django.forms import ValidationError

def CheckIsAnImage(name,file):
    try:
        image = Image.open(file)
        image.verify()
    except Exception:
        raise ValidationError(_('{} is no a valid image'.format(name)),code='image_invalid')