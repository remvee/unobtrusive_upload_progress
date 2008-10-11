if (self == self.top) {
  var UploadProgress = {

    // Setup upload progress for form with "upload_progress" class.
    setup: function() {
      var form = UploadProgress.findForm(window.document.forms)

      if (form) {
        $(window.document.body).insert({bottom: '<iframe id="upload_hole" name="upload_hole" src="about:blank" style="display:none"></iframe>'})

        UploadProgress.updateUploadId(form)
        form.target = 'upload_hole'

        Event.observe(form, 'submit', function() {
          UploadProgress.submitTimeout = setTimeout(function() {
            UploadProgress.updater(form)
            UploadProgress.onStart(form)
          }, 2000)
        })
      }
    },

    // Updater is kicked off on submit and keeps running every second until status indicates upload is finished.
    updater: function progress(form) {
      new Ajax.Request('/upload_progress?' + UploadProgress.upload_progress_id, {
        onSuccess: function(transport) {
          var status = transport.responseJSON

          if (status) {
            status.percentage = Math.round(100 - (status.remaining / status.total * 100))
            UploadProgress.onUpdate(form, status)
          }

          if (!status || status.remaining != 0) {
            setTimeout(function(){UploadProgress.updater(form)}, 1000)
          }
        }
      })
    },

    // Run from the iframe on load to finish up submit.
    done: function() {
      if (UploadProgress.submitTimeout) clearTimeout(UploadProgress.submitTimeout)

      var form = UploadProgress.findForm(window.document.forms)
      var upload_location = UploadProgress.relativeUrl(window.upload_hole.location.href)
      var action_location = UploadProgress.relativeUrl(form.action)

      if (upload_location == action_location) {
        form.innerHTML = UploadProgress.findForm(window.upload_hole.document.forms).innerHTML
        UploadProgress.updateUploadId(form)
        UploadProgress.onFinish(form)
      } else {
        window.location.href = window.upload_hole.location.href
      }
    },

    // Strip proto://domain from url.
    relativeUrl: function(url) {
      return url.replace(/^[a-z]+:\/\/[^\/]+\//, '/')
    },

    // Add refresh upload_progress_id to form.action.
    updateUploadId: function(form) {
      var url = form.action
      url = url.replace(/\bupload_progress_id=[^&]+/, '').replace(/\?$/, '')
      UploadProgress.upload_progress_id = new Date().getTime()
      form.action = url + (url.match(/\?/) ? '&' : '?') + 'upload_progress_id=' + UploadProgress.upload_progress_id
    },

    // Find first multipart/form-data form with a file input.
    findForm: function(forms) {
      for (var i = 0; i < forms.length; i++) {
        var f = forms[i]
        if (f.enctype == 'multipart/form-data') {
          for (var j = 0; j < f.elements.length; j++) {
            var e = f.elements[j]
            if (e.type == 'file') return f
          }
        }
      }
      return null
    },

    // Called when upload started.
    onStart: function(form) {
      UploadProgress.handlers.start.call(form)
    },

    // Called every second by UploadProgress.updater.
    onUpdate: function(form, status) {
      UploadProgress.handlers.update.call(form, status)
    },

    // Called by UploadProgress.done.
    onFinish: function(form) {
      UploadProgress.handlers.finish.call(form)
    },

    // Replace all event handlers.
    register: function(handlers) {
      UploadProgress.handlers = handlers
    },

    handlers: {
      // Show status indicator.
      start: function() {
        Position.prepare()

        if (!$('upload_progress_status')) {
          $(window.document.body).insert({top: '<div id="upload_progress_status" style="'
                                          + 'display:block;position:absolute;top:0;left:0;'
                                          + 'width:100%;height:100%;background:white">'
                                          + '<div style="background:red;height:100%"></div></div>'})
        }
        $('upload_progress_status').down('div').setStyle({width: 0})

        new Effect.Opacity('upload_progress_status', {from: 0.0, to: 0.75})
      },
      // Update status indicator.
      update: function(status) {
        var bar = $('upload_progress_status').down('div')
        bar.innerHTML = '<span style="float:right;color:white;font-weight:bold">' + status.percentage + '%</span>'
        Effect.Queues.get('upload_progress').each(function(e){e.cancel()})
        new Effect.Morph(bar, {style: { width: status.percentage + '%'}, duration: 1, queue: {scope: 'upload_progress'}})
      },
      // Remove status indicator; called by UploadProgress.done.
      finish: function() {
        $('upload_progress_status').remove()
      }
    }
  }

  Event.observe(window, 'load', UploadProgress.setup)
} else if (window.parent && window.parent.UploadProgress) {
  Event.observe(window, 'load', window.parent.UploadProgress.done)
}