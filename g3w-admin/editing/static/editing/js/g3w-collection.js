/**
 * @file
 * 
 * @since 4.1.0
 */

import { Feature } from "./g3w-feature";

/**
 * Wrapper for native Array or ol.Collection
 */
export class Collection {

  /**
   * 
   * @param { Boolean } is_ol whether to use ol.Collection or native Array
   */
  constructor(is_ol) {
    this._is_ol  = is_ol;
    this._store  = is_ol ? new ol.Collection([]) : [];
  }

  /**
   * @returns { Array } array of features
   */
  getArray() {
    return this._store?.getArray?.() ?? this._store;
  }

  /**
   * Add feature to collection
   * @param { Object } feature
   * @returns { void }
   */
  add(feature) {
    this._store.push(feature);
    this._store?.dispatchEvent?.('change');
  }

  /**
   * Update a feature in collection
   * @param {Feature} feature 
   */
  update(feature) {
    if (this._is_ol) {
      const index = this._store.getArray().findIndex(f => feature.getUid() === f.getUid());
      if (index >= 0) {
        this._store.removeAt(index);
        this._store.insertAt(index, feature);
        this._store.dispatchEvent('change');
      }
    } else {
      this._store.find((feat, idx) => {
        if (feature.getUid() === feat.getUid() ) {
          this._store[idx] = feature;
          return true;
        }
      });
    }
  }

  /**
   * Remove feature from collection
   * @param {Feature} feature
   * @returns { void }  
   */
  remove(feature) {
    const index = this.getArray().findIndex(f => feature.getUid() === f.getUid());
    if (-1 === index) {
      return;
    }
    if (this._is_ol) {
      this._store.removeAt(index);
      this._store.dispatchEvent('change');
    } else {
      this._store.splice(index, 1);
    }
  }

  /**
   * Clear all features from collection
   * @returns { void }
   */
  clear() {
    if (this._is_ol) {
      this._store.clear();
    } else {
      this._store.length = 0;
    }
  }

}