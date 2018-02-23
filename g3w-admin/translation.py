from modeltranslation.translator import translator, TranslationOptions
from stress.models import SignalerRole


class SignalerRoleTranslationOptions(TranslationOptions):
    fields = ('role',)


translator.register(SignalerRole, SignalerRoleTranslationOptions)