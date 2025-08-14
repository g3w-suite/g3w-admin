const { ApplicationState } = g3wsdk.core;

/**
 * ORIGINAL SOURCE: g3w-client/src/utils/createRelationsUrl.js@v4.0.0
 */
export function createRelationsUrl({
  layer          = {},
  relation       = {},
  fid,
  type       = 'data', // <editing, data, xls>
}) {
  return `${ApplicationState.project.getLayerById(
      undefined === relation.father
        ? (layer.id === relation.referencedLayer ? relation.referencingLayer : relation.referencedLayer)
        : (layer.id === relation.father          ? relation.child            : relation.father)
    ).getUrl(type)}?relationonetomany=${relation.id}|${_sanitizeFidFeature(fid)}`;
}

function _sanitizeFidFeature(fid) {
  if ('string' === typeof fid && Number.isNaN(1*fid))  {
    fid = fid.split('.');
    fid = fid.at(2 === fid.length ? 1 : 0);
  }
  return fid;
}