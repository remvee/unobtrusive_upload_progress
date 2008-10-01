if (self == self.top) {
  var UploadProgress = {

    // Setup upload progress for form with "upload_progress" class.
    setup: function() {
      var form = UploadProgress.findForm(window.document.forms)

      if (form) {
        $(window.document.body).insert({top: '<div id="upload_progress_status" style="display:none"></div>'})
        $(window.document.body).insert({bottom: '<iframe id="upload_hole" name="upload_hole" src="about:blank" style="display:none"></iframe>'})

        UploadProgress.updateUploadId(form)
        form.target = 'upload_hole'

        Event.observe(form, 'submit', function() {
          UploadProgress.submitTimeout = setTimeout(function() {
            UploadProgress.updater(form)
            UploadProgress.onStart()
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
            UploadProgress.onUpdate(status)
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
        UploadProgress.onFinished()
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

    // Find first form with "upload_progress" class.
    findForm: function(forms) {
      for (var i = 0; i < forms.length; i++) {
        if (forms[i].className == 'upload_progress') return forms[i]
      }
      return null
    },

    // Show status indicator, called when upload started.
    onStart: function() {
      Position.prepare()
      $('upload_progress_status').setStyle({display: 'block', position: 'absolute', width: 0, top: Position.deltaY + 10 + 'px'})
      new Effect.Opacity('upload_progress_status', {from: 0.0, to: 0.75})
    },

    // Update status indicator, called every second by UploadProgress.updater.
    onUpdate: function(status) {
      $('upload_progress_status').innerHTML = status.percentage + "%"
      Effect.Queues.get('upload_progress').each(function(e){e.cancel()})
      new Effect.Morph('upload_progress_status', {style: { width: status.percentage + '%'}, duration: 1, queue: {scope: 'upload_progress'}})
    },

    // Remove status indicator; called by UploadProgress.done.
    onFinished: function() {
      new Effect.Opacity('upload_progress_status', {from: 0.75, to: 0.0})
    }
  }

  Event.observe(window, 'load', UploadProgress.setup)
} else if (window.parent && window.parent.UploadProgress) {
  Event.observe(window, 'load', window.parent.UploadProgress.done)
}
