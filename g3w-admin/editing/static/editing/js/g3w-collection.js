/**
 * @file
 * 
 * @since 4.1.0
 */

/**
 * Wrapper for native Array or ol.Collection
 */
export class Collection {

  constructor(is_ol) {
    this._is_ol  = is_ol;
    this._store  = is_ol ? new ol.Collection([]) : [];
  }

  getArray() {
    return this._store?.getArray?.() ?? this._store;
  }

  add(feature) {
    this._store.push(feature);
    this._store?.dispatchEvent?.('change');
  }

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

  clear() {
    if (this._is_ol) {
      this._store.clear();
    } else {
      this._store.length = 0;
    }
  }

}