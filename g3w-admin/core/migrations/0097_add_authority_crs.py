from django.db import migrations, models


def add_qgis_authority_crs(apps, schema_editor):
    """Populate the application CRS catalog with non-EPSG QGIS definitions."""
    from qgis.core import QgsCoordinateReferenceSystem

    SpatialRefSys = apps.get_model('core', 'G3WSpatialRefSys')
    existing_srids = set(SpatialRefSys.objects.values_list('srid', flat=True))
    existing_authids = set(SpatialRefSys.objects.exclude(auth_id__isnull=True).values_list('auth_id', flat=True))
    records = []

    for qgis_srs_id in QgsCoordinateReferenceSystem.validSrsIds():
        crs = QgsCoordinateReferenceSystem.fromSrsId(qgis_srs_id)
        authid = crs.authid()
        if not crs.isValid() or not authid or ':' not in authid:
            continue

        auth_name, auth_code = authid.split(':', 1)
        if auth_name.upper() in {'EPSG', 'QGIS', 'USER', 'CUSTOM'}:
            continue

        srid = crs.postgisSrid()
        if srid <= 0 or srid > 2147483647 or srid in existing_srids or authid in existing_authids:
            continue

        proj4 = crs.toProj()
        srtext = crs.toWkt()
        if not proj4 or not srtext or len(proj4) > 2048 or len(srtext) > 2048:
            continue

        try:
            auth_srid = int(auth_code)
        except ValueError:
            auth_srid = 0
        if not -2147483648 <= auth_srid <= 2147483647:
            auth_srid = 0

        records.append(SpatialRefSys(
            srid=srid,
            auth_name=auth_name,
            auth_srid=auth_srid,
            auth_id=authid,
            srtext=srtext,
            proj4text=proj4,
        ))
        existing_srids.add(srid)
        existing_authids.add(authid)

        if len(records) == 500:
            SpatialRefSys.objects.bulk_create(records)
            records = []

    if records:
        SpatialRefSys.objects.bulk_create(records)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0096_enable_pg_trgm'),
    ]

    operations = [
        migrations.AddField(
            model_name='g3wspatialrefsys',
            name='auth_id',
            field=models.CharField(blank=True, max_length=256, null=True, unique=True, verbose_name='Authority ID'),
        ),
        migrations.RunPython(add_qgis_authority_crs, migrations.RunPython.noop),
    ]