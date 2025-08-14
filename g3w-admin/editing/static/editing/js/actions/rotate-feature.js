/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * ORIGINAL SOURCE: g3w-client-plugin-editing/interactions/rotate.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { evaluateExpressionFields }         from '../utils/evaluateExpressionFields.js';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { Step }                             from '../g3w-step.js';

const { GUI }                               = g3wsdk.gui;

/**
 * @file Initially based on: https://github.com/Viglino/ol-ext/blob/v4.0.30/src/interaction/Transform.js
 * 
 * ol-ext v4.0.30 (https://github.com/Viglino/ol-ext)
 * Copyright 2016-2018 - Jean-Marc Viglino, IGN-France 
 * Licensed under BSD-3-Clause (https://github.com/Viglino/ol-ext/blob/master/LICENSE)
 * 
 * @since 4.0.0
 */

function _setCursor(elt, cursor) {
  if (elt instanceof ol.Map) elt = elt.getTargetElement()
  // prevent flashing on mobile device
  if (!('ontouchstart' in window) && elt instanceof Element) {
    elt.style.cursor = cursor;
  }
}

/**
 * Cursors for transform
 */
const CURSORS = {
  'default':   'auto',
  'select': '   pointer',
  'rotate':    'move',
};

/**
 * Rotate interaction
 * 
 * @extends ol.interaction.Pointer
 * 
 * @param { Object } options
 * @param { Array } options.features collection of feature to transform,
 */
class RotateInteraction extends ol.interaction.Pointer {

  constructor(options = {}) {

    super({
      handleDownEvent: e => this.handleDownEvent_(e),
      handleDragEvent: e => this.handleDragEvent_(e),
      handleUpEvent:   e => this.handleUpEvent_(e),
    })
    
    //Selection Features
    this.selection_ = new ol.Collection();
    //set default Pint feature to false
    this.ispt_      = false;

    // Create a new overlay layer for the sketch
    this.handles_   = new ol.Collection();

    this.overlayLayer_ = new ol.layer.Vector({
      source: new ol.source.Vector({
        features:        this.handles_,
        useSpatialIndex: false,
        wrapX:           false // For vector editing across the -180° and 180° meridians to work properly, this should be set to false
      }),
      name:                   'Rotate overlay',
      displayInLayerSwitcher: false,
      // Return the style according to the handle type
      style: f => this.style[(f.get('handle') || 'default') + (f.get('constraint') || '') + (f.get('option') || '')],
      updateWhileAnimating:   true,
      updateWhileInteracting: true,
    });

    // Collection of feature to transform
    this.features_ = new ol.Collection(options.features);

    //Is updating geometry
    this._change   = false;

    //Function to dandle point geometry rotation
    this._pointRotation = ({ rotation, feature}) => {
      if (!this._change) {
        this.dispatchEvent({ type: 'rotatestart', feature });
      }
      feature.set('rotation', Number(rotation));
      if (this._change) {
         this.dispatchEvent({
          type:       'rotating',
          feature,
        })
      }
      this._change = true;
    }

    /* Can rotate the feature */
    this.set('rotate', true);

    /* Handle selection */
    this.set('selection', true);

    /* Keep rectangle angles 90 degrees */
    this.set('keepRectangle', false);

    /* Add buffer to the feature's extent */
    this.set('buffer', 0);

    // Force redraw when changed
    this.on('propertychange',  () => this.drawSketch_() );

    // setstyle
    this.setDefaultStyle();
  }

  /**
   * Remove the interaction from its current map, if any,  and attach it to a new
   * map, if any. Pass `null` to just remove the interaction from the current map.
   * @param {ol.Map} map Map.
   * @api stable
   */
  setMap(map) {
    const oldMap = this.getMap();
    if (oldMap) {
      oldMap.removeLayer(this.overlayLayer_)
      if (this.previousCursor_) {
        _setCursor(oldMap, this.previousCursor_);
      }
      this.previousCursor_ = undefined;
    }
    super.setMap(map);
    this.overlayLayer_.setMap(map);
    if (null === map ) {
      this.select(null);
    }
    if (null !== map) {
      this.isTouch = /touch/.test(map.getViewport().className);
      this.setDefaultStyle();
    }
  }

  /**
   * Activate/deactivate interaction
   * @param {bool}
   * @api stable
   */
  setActive(b) {
    this.select(null)
    if (this.overlayLayer_) {
      this.overlayLayer_.setVisible(b);
    }
    super.setActive(b);
  }

  /**
   * Set default sketch style
   */
  setDefaultStyle() {
    const stroke = new ol.style.Stroke({ color: [255, 0, 0, 1], width: 1 });
    const fill   = new ol.style.Fill({ color: [255, 255, 255, 0.8] });
    /** Style for handles */
    this.style = {
      'default': [
          new ol.style.Style({
          image: new ol.style.RegularShape({
            fill,
            stroke,
            radius: this.isTouch ? 16 : 8,
            points: 4,
            angle:  Math.PI / 4
          }),
          stroke: new ol.style.Stroke({ color: [255, 0, 0, 1], width: 1, lineDash: [4, 4] }),
          fill:   new ol.style.Fill({ color: [255, 0, 0, 0.01] }),
        })
      ],
      'rotate':   [ 
        new ol.style.Style({ 
          image: new ol.style.RegularShape({
            fill,
            stroke,
            radius: this.isTouch ? 16 : 8,
            points: 4,
            angle:  Math.PI / 4
          }),  
          stroke, fill 
        }) 
      ],
      'arrow': feat => new ol.style.Style({
                        image: new ol.style.Icon({
                        src: `${GUI.getResourcesUrl()}images/Arrow.svg`,
                        width	: 50,
                        height: 50,
                        rotation: ((feat.get('rotation')) * Math.PI) / 180,
                      }),
                    }),       
    }
    this.drawSketch_();
  }

  /**
   * Set sketch style.
   * @param {style} style Style name: 'default','rotate'
   * @param {ol.style.Style|Array<ol.style.Style>} olstyle
   * @api stable
   */
  setStyle(style, olstyle) {
    if (!olstyle) { return }
    if (olstyle instanceof Array) { this.style[style] = olstyle }
    else { this.style[style] = [olstyle] }
    
    for (let i = 0; i < this.style[style].length; i++) {
      const im = this.style[style][i].getImage();
      if (im && style == 'rotate') {
        im.getAnchor()[0] = -5;
      }
        
      if (im && this.isTouch) {
        im.setScale(1.8)
      }

      const tx = this.style[style][i].getText();

      if (tx && style == 'rotate') {
        tx.setOffsetX(this.isTouch ? 14 : 7);
      }
      
      if (tx && this.isTouch) {
        tx.setScale(1.8);
      }
    }

    this.drawSketch_();
  }

  /** Get Feature at pixel
   * @param {ol.Pixel}
   * @return {ol.feature}
   * @private
   */
  getFeatureAtPixel_(pixel) {
    return this.getMap().forEachFeatureAtPixel(pixel,
      feature => {
        if (this.handles_.getArray().find(f => feature === f)) {
          return { feature, constraint: feature.get('constraint'), option: feature.get('option') }
        }
      },
      { hitTolerance: (isMobile && isMobile.any) ? 10 : 0 }
    ) || {}
  }

  /** Rotate feature from map view rotation
   * @param {ol.Feature} f the feature
   * @param {ol.geom.Geometry} rotated geometry
   */
  getGeometryRotateToZero_(f) {
    const rotGeom = f.getGeometry().clone();
    rotGeom.rotate(this.getMap().getView().getRotation() * -1, this.getMap().getView().getCenter());
    return rotGeom;
  }

  /** Test if rectangle
   * @param {ol.Geometry} geom
   * @returns {boolean}
   * @private
   */
  _isRectangle(geom) {
    return this.get('keepRectangle') && 'Polygon' === geom.getType() && 5 === geom.getCoordinates()[0].length;
  }

  /** Draw transform sketch
  * @param {boolean} draw only the center
  */
  drawSketch_(center) {
    let f, geom;
    //check if geometry is a rectangle
    const keepRectangle = this.selection_.item(0) && this._isRectangle(this.selection_.item(0).getGeometry());
    //clear overlay source features
    this.overlayLayer_.getSource().clear();
    //If no selection feature, skip
    if (!this.selection_.getLength()) { return; }
    //get extent of selected feature
    let ext = this.getGeometryRotateToZero_(this.selection_.item(0)).getExtent();
    let coords;
    //In case of rectangle
    if (keepRectangle) {
      coords = this.getGeometryRotateToZero_(this.selection_.item(0)).getCoordinates()[0].slice(0, 4);
      coords.unshift(coords[3]);
    }
    // Clone and extend
    ext = ol.extent.buffer(ext, this.get('buffer'));
    this.selection_.forEach(f => ol.extent.extend(ext, this.getGeometryRotateToZero_(f).getExtent()));

    if (true === center) {
      if (!this.ispt_) {
        this.overlayLayer_.getSource().addFeature(new ol.Feature({ geometry: new ol.geom.Point(this.center_)}));
        geom = ol.geom.Polygon.fromExtent(ext);
        f = new ol.Feature(geom);
        this.overlayLayer_.getSource().addFeature(f);
      }
    } else {
      if (this.ispt_) {
        // Calculate extent around the point
        const p = this.getMap().getPixelFromCoordinate(ol.extent.getCenter(ext));
        if (p) {
          ext = ol.extent.boundingExtent([
            this.getMap().getCoordinateFromPixel([p[0] - 30, p[1] - 30]),
            this.getMap().getCoordinateFromPixel([p[0] + 30, p[1] + 30])
          ])
        }
      }
      geom = keepRectangle ? new ol.geom.Polygon([coords]) : ol.geom.Polygon.fromExtent(ext);
  
      // Add sketch
      this.overlayLayer_.getSource().addFeatures([
        new ol.Feature(geom),
      ]);
    }
  }

  /**
   * Select a feature to transform
   * 
   * @param {ol.Feature} feature the feature to transform
   * @param {boolean} add true to add the feature to the selection, default false
   * 
   * @fires select
   */
  select(feature) {
    if (!feature && this.selection_) {
      this.selection_.clear();
      return false
    }
    // Check if feature is already selected
    if (!feature || !feature.getGeometry || !feature.getGeometry()) { return }

    // Add to selection
    this.selection_.push(feature)
    //Chenck if is point feature
    this.ispt_     = 'Point' === feature.getGeometry().getType();

    if (this.ispt_) {
      
      GUI.showUserMessage({
        type:      'tool',
        title:     'Rotation',
        size:      'small',
        autoclose: false,
        closable:  false,
        iconClass: 'refresh',
        hooks: {
          body: {
            template: /* html */`
              <div id = "rotation-feature-point-tool">
                <input class = "form-control" type="number" min = "0" max = "360" :value = "rotation" @input = "change"/>
              </div>
            `,
            data() {
              return {
                rotation: feature.get('rotation') || 0,
              }
            },
            methods: {
              change: evt => this._pointRotation({ feature, rotation: evt.target.value })
            },
           
            created() {
              feature.on('propertychange', e => this.rotation = e.target.get('rotation') )
            },
            beforeDestroy: () => {
              if (this.change) {
                this.dispatchEvent({ type: 'rotateend', feature });
              }
              this.change_ = false;
              this.pdegrees_ = null;
            }
          }
        }

      })
      
      //store previous point rotaion degree
      this.pdegrees_ = null;
      this.drawSketch_();
      //need to wait selection set style
      setTimeout(() => {
        //get original style of the feature
        this.oriStyle = feature.getStyle();
        //set arrow style
        feature.setStyle(this.style['arrow']);
      })
    }

    this.watchFeatures_();
    // select event
    this.dispatchEvent({ type: 'select', feature, features: this.selection_ });
  }

  /** Watch selected features
   * @private
   */
  watchFeatures_() {
    // Listen to feature modification
    if (this._featureListeners) {
      this._featureListeners.forEach(l => ol.Observable.unByKey(l));
    }
    this._featureListeners = this.selection_.getArray().map(f  => 
      f.on('change', () => {
        if (!this.isUpdating_) {
          this.drawSketch_();
        }
      })
    )
  }

  /**
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * 
   * @return {boolean} `true` to start the drag sequence.
   * 
   * @private
   * 
   * @fires select
   * @fires rotatestart
   */
  handleDownEvent_(evt) {
    const sel          = this.getFeatureAtPixel_(evt.pixel);
    const feature      = sel.feature;
    if (!feature && this.selection_.getLength()) { 
      this._rotateEndFnc();
      this.selection_.clear();
      this.overlayLayer_.getSource().clear();
      return false;
    }
    this.opt_          = sel.option;
    this.constraint_   = sel.constraint;
    this.oriStyle      = feature.getStyle();
    // Save info
    // Get coordinate of the handle (for snapping)
    this.coordinate_   = feature.get('handle') ? feature.getGeometry().getCoordinates() : evt.coordinate;
    this.pixel_        = this.getMap().getCoordinateFromPixel(this.coordinate_); // evt.pixel;
    this.geoms_        = [];
    this.rotatedGeoms_ = [];
    let extent         = ol.extent.createEmpty();
    this.geoms_.push(this.selection_.item(0).getGeometry().clone());
    extent = ol.extent.extend(extent, this.selection_.item(0).getGeometry().getExtent());
    this.extent_ = (ol.geom.Polygon.fromExtent(extent)).getCoordinates()[0];
    this.center_  = this.getCenter() || ol.extent.getCenter(extent);
    // we are now rotating (cursor down on rotate mode), so apply the grabbing cursor
    const element = evt.map.getTargetElement();
    _setCursor(element, CURSORS.rotate);
    this.previousCursor_ = element.style.cursor;
    this.angle_          = Math.atan2(this.center_[1] - evt.coordinate[1], this.center_[0] - evt.coordinate[0]);
    this.dispatchEvent({
      type:       'rotatestart',
      feature:    this.selection_.item(0)
    });
    this._change = true

    return true
  }

  /**
   * Get the rotation center
   * @return {ol.coordinate|undefined}
   */
  getCenter() {
    return this.get('center');
  }

  /**
   * Set the rotation center
   * @param {ol.coordinate|undefined} c the center point, default center on the objet
   */
  setCenter(c) {
    return this.set('center', c);
  }

  /**
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * 
   * @private
   * 
   * @fires rotating
   * @fires translating
   * @fires scaling
   */
  handleDragEvent_(evt) {
    let i, f, geometry;
    const feature    = this.selection_.item(0);
    const pt         = [evt.coordinate[0], evt.coordinate[1]];
    this.isUpdating_ = true;
    const a          = Math.atan2(this.center_[1] - pt[1], this.center_[0] - pt[0]);
    //No Point geometry type
    if (!this.ispt_) {
      for (i = 0, f; f = this.selection_.item(i); i++) {
        geometry = this.geoms_[i].clone();
        geometry.rotate(a - this.angle_, this.center_);
        f.setGeometry(geometry);
      }
    }
    //Point Geometry type
    if (this.ispt_) {
      //get rotation degree
      let degrees = (a * (180 / Math.PI)); // between -180 to 180 (start at 145 lower right to bbox)
      if (null === this.pdegrees_) {
        this.pdegrees_ = degrees;
      }      
      //get direction (clockwise or not)
      const clockwise = (this.pdegrees_ > degrees) || (this.pdegrees_ > degrees);
      //get current rotation
      let rotation    = Number(feature.get('rotation'));
      if (rotation > 360 && clockwise) {
        rotation = 0;
      }
      if (rotation < 0 && !clockwise) {
        rotation = 360;
      }
    
      this._pointRotation({ rotation: rotation + (clockwise ? 1 : -1), feature });
      this.pdegrees_ = degrees;
    }

    this.drawSketch_(true);

    this.isUpdating_ = false;
  }

  _rotateEndFnc() {
  // remove rotate cursor on Up event, otherwise it's stuck on grab/grabbing
    const feature = this.selection_.item(0);
    _setCursor(this.getMap().getTargetElement(), CURSORS.default);
    this.previousCursor_ = undefined;

    this.dispatchEvent({
      type:     'rotateend',
      feature
    })

    return false;
  }

  /**
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * @return {boolean} `false` to stop the drag sequence.
   * 
   * @fires rotateend
   * @fires translateend
   * @fires scaleend
   */
  handleUpEvent_() {
    if (!this.ispt_) {
      this._rotateEndFnc();
    }
    this.drawSketch_();
  }

  /** Get the features that are selected for transform
   * @return ol.Collection
   */
  getFeatures() {
    return this.selection_;
  }

}

/**
 * @since g3w-client-plugin-editing@v4.0.0 Rotate feature
 */
export class RotateFeatureStep extends Step {

  constructor(options = {}) {
    options.help = "editing.steps.help.rotate";

    super(options);

    this.isChange          = false; // changed if geometry or rotaion for Poin geometry is changed
    this._feature          = null;
    this._originalFeature  = null; 
    this.drawInteraction   = null;
    this.promise; // need to be set here in case of picked features
  }

  run(inputs) {               
    /** Need two different promises: One for stop() method and clean-selected feature,
     * and another one for a run task. If we use the same promise, when stop a task without move feature,
     * this.promise.resolve(), it fires also thenable method listens to resolve promise of a run task,
     * that call stop task method.*/
    return new Promise((resolve) => {
      const promise        = new Promise(r => this.resolve = r);
      this.changeKey       = null;
      setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });
      this.addInteraction(
        new RotateInteraction({ features: inputs.features }), {
        'rotatestart': e => {
          this._feature         = e.feature;
          this.isChange         = true;
          this._originalFeature = this._feature.clone();
        },
        'rotateend': async e => {
          if (this.isChange) {
            await this.updateFeature(e.feature);
          }
          this.isChange = false;
          resolve(inputs);
        },
      }).select(inputs.features.at(- 1));
    })
  }

  /**
   * Method to update layer feature
   */
  async updateFeature() {
    const inputs  = this.getInputs();
    const context = this.getContext();
    try {
      await evaluateExpressionFields({ inputs, context, feature: this._feature });
    } catch(e) {
      console.warn(e);
    }
    context.session.pushUpdate(inputs.layer.getId(), this._feature.clone(), this._originalFeature);
  }

  async stop(input, context) {
    if (this.isChange) {
     //In case of Point geometry, afetr change rotation and click on tool to stop, need to update feature 
     await this.updateFeature();
     //need to save it on session
     context.session.save();
    }
    this.resolve(true);
    this.resolve  = null;
    this.isChange = false
    GUI.closeUserMessage();
  }
}