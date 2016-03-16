/*
Version: 1.3.0.
Authors: Ats Nisov (github.com/Rubinous), chrisvilla
 */

// For CORS see https://github.com/enyo/dropzone/issues/33


window.djDropzones = [];
window.djDForms = [];


// Class
window.DjDForm = function ($el, djDropzones, opts) {
  var self = this;

  if ($el.length != 1) {
    console.error("Couldn't create DjDForm.");
  }

  this.$el = $el;
  this.$submit = this.$el.find('input[type="submit"]').not(".djdropzone-submit-warning input");
  this.$submitWarning = this.$el.find(".djdropzone-submit-warning");

  this.djDropzones = djDropzones;

  this.opts = $.extend({}, {
    disableSubmitWhileUploading: false,
    submitWarningWhileUploading: false
  }, this.$el.data("djdropzone-djdform-opts"), opts || {});

  this.$submit.on("click", function (event) {
    if (self.opts.submitWarningWhileUploading && !self.isReady()) {
      event.stopImmediatePropagation();
      event.preventDefault();

      self.$submitWarning.removeClass("hidden");
      self.$submit.addClass("hidden");
    }
  });

  var addfileCompleteRemovedfileHandler = function(args) {
    if (self.opts.disableSubmitWhileUploading) {
      self.updateFormSubmitDisable();
    }

    if (self.opts.submitWarningWhileUploading) {
      self.updateSubmitWarning();
    }
  };

  for (var i = 0; i < this.djDropzones.length; i += 1) {
    var djDropzone = this.djDropzones[i];
    djDropzone.on("addedfile", addfileCompleteRemovedfileHandler);
    djDropzone.on("complete", addfileCompleteRemovedfileHandler);
    djDropzone.on("removedfile", addfileCompleteRemovedfileHandler);
  }
};

window.DjDForm.prototype.isReady = function() {
  var ready = true;

  for (var j = 0; j < this.djDropzones.length; j += 1) {
    var djDropzone = this.djDropzones[j];
    ready = ready && djDropzone.isReady();
  }

  return ready;
};

window.DjDForm.prototype.updateSubmitWarning = function() {
  if (this.isReady()) {
    this.$submit.removeClass("hidden");
    this.$submitWarning.addClass("hidden");
  }
};

window.DjDForm.prototype.updateFormSubmitDisable = function() {
  /*
  Updates the disable on the submit button to match the object's state.
   */

  var self = this;

  this.$submit.each(function(i, submitEl) {
    submitEl.disabled = !self.isReady();
  });
};


// Class
window.DjDropzone = function(el) {
  this.dropzone = null;
  this.initialFileUrls = null;
  this.initialFileUrlsLoading = [];
  this.readyStates = [Dropzone.SUCCESS, Dropzone.ERROR, Dropzone.CANCELED];

  this.$el = $(el);
  this.$dropzone = this.$el.find(".djdropzone-dropzone");
  this.fieldName = this.$el.data("field-name");
  this.$input = this.$el.find('input[name="' + this.fieldName + '"]');
  this.$loading = this.$el.find(".djdropzone-loading");
  this.dropzoneConfig = this.$el.data("dropzone-config") || {};

  this.dropzoneConfig['maxfilesexceeded'] = function(file) {
    this.removeAllFiles();
    this.addFile(file);
  };

  this.$el = this.$el.closest("form");
  this.$submit = this.$el.find('input[type="submit"]');

  this.initDropzone();
  this.initPreviouslyUploadedFiles();
};


window.DjDropzone.camelize = function (str) {
  return str.replace(/[\-_](\w)/g, function (match) {
    return match.charAt(1).toUpperCase();
  });
};

window.DjDropzone.prototype.getFileUrls = function() {
  if (this.$input.val().length > 0) {
    return this.$input.val().split(",");
  } else {
    return [];
  }
};

window.DjDropzone.prototype.pushFileUrl = function(fileUrl) {
  var fileUrls = this.getFileUrls();

  if (fileUrls.indexOf(fileUrl) < 1) {
    fileUrls.push(fileUrl);
    this.$input.val(fileUrls.join());
  }
};

window.DjDropzone.prototype.removeFileUrl = function(fileUrl) {
  var fileUrls = this.getFileUrls();
  var i = fileUrls.indexOf(fileUrl);

  if (i >= 0) {
    fileUrls.splice(i, 1);
    this.$input.val(fileUrls.join());
  }
};

window.DjDropzone.prototype.initDropzone = function() {
  var self = this;

  if (this.$dropzone.length != 1) {
    throw "Must have exactly one `.djdropzone-dropzone` elements in this `.djdropzone`."
  }

  this.dropzoneConfig["init"] = function() {
    // `this` is an instance of `Dropzone`.

    this.on("sending", function(file, xhr, formData) {
      xhr.setRequestHeader("X-CSRFToken", $.cookie('csrftoken'));
    });

    // File was successfully uploaded
    this.on("success", function(file, response) {
      if (response) {
        var fileUrl = JSON.parse(response)["file_url"];
        file.fileUrl = fileUrl;
        self.pushFileUrl(fileUrl);
      }
    });

    // Show error messages
    this.on("error", function(file, errorMessage) {
      console.error(errorMessage);
    });

    this.on("removedfile", function(file) {
      self.removeFileUrl(file.fileUrl);
    });
  };

  window.Dropzone.options[DjDropzone.camelize(this.$dropzone[0].id)] = false;

  this.$dropzone.addClass("dropzone");

  this.dropzone = new Dropzone(this.$dropzone[0], this.dropzoneConfig);
};

window.DjDropzone.prototype.initPreviouslyUploadedFiles = function() {
  this.initialFileUrls = this.getFileUrls();

  for (var i = 0; i < this.initialFileUrls.length; i += 1) {
    this.addPreviouslyUploadedFile(this.initialFileUrls[i]);
  }
};

window.DjDropzone.prototype.on = function (eventName, callback) {
  this.dropzone.on(eventName, function (args) {
    callback.apply({}, args);
  });
};

window.DjDropzone.prototype.isReady = function () {
  var ready = true;
  for (var i = 0; i < this.dropzone.files.length; i += 1) {
    var file = this.dropzone.files[i];
    ready =  ready && (file.djDFakeFile || (this.readyStates.indexOf(file.status) >= 0));
  }
  return ready;
};

window.DjDropzone.prototype.updateLoader = function () {
  if (this.initialFileUrlsLoading.length == 0) {
    this.$loading.addClass("hidden");
  } else {
    this.$loading.removeClass("hidden");
  }
};

window.DjDropzone.prototype.addPreviouslyUploadedFile = function(fileUrl) {
  /*
  This method adds previously uploaded files (by file urls found in the hidden input within .djdropzone) to the Dropzone
  so that their thumbnails are shown in the Dropzone. These files won't be uploaded anywhere.

  TODO: This feature should really be part of Dropzonejs itself, as the implementation is very hacky and is likely to
  break when Dropzonejs is updated.
   */

  var self = this;

  var parts = fileUrl.split("/");
  var fileName = parts[parts.length - 1];

  var fakeFile = new File([], fileName);

  fakeFile.djDFakeFile = true;

  fakeFile.upload = {
    progress: 100,
    total: 0,
    bytesSent: 0
  };
  fakeFile.accepted = true;
  fakeFile.processing = true;  // This is never set to `false` and I believe not even used for anything.
  fakeFile.status = Dropzone.SUCCESS;
  fakeFile.name = fileName;
  fakeFile.fileUrl = fileUrl;

  this.dropzone.files.push(fakeFile);

  this.dropzone.emit("addedfile", fakeFile);

  fakeFile.previewElement.classList.add("dz-success");
  fakeFile.previewElement.classList.add("dz-complete");
  if (fakeFile._removeLink) {
    fakeFile._removeLink.textContent = self.dropzone.options.dictRemoveFile;
  }

  this.dropzone._updateMaxFilesReachedClass();

  // TODO: Hiding the size, because it shows "0 b". Implement showing correct size.
  $(fakeFile.previewElement).find(".dz-size span").addClass("invisible");

  this.dropzone.createThumbnailFromUrl(fakeFile, fileUrl, null, "anonymous");
};


$(function() {

  var $forms = $('form');

  $forms.each(function(i, formEl) {
    var djDropzones = [];
    var $form = $(formEl);
    var $djDropzones = $form.find(".djdropzone");

    $djDropzones.each(function(i, djDropzoneEl) {
      var djDropzone = new DjDropzone(djDropzoneEl);
      
      djDropzones.push(djDropzone);
      window.djDropzones.push(djDropzone);
    });

    var djDForm = new DjDForm($form, djDropzones);

    window.djDForms.push(djDForm);
  });

});
