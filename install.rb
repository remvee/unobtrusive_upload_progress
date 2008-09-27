puts "Copying JavaScript to public/javascripts/upload_progress.js.."
FileUtils.cp File.dirname(__FILE__) + '/javascripts/upload_progress.js', "#{RAILS_ROOT}/public/javascripts"

puts %q{
Don't forget to including this JavaScript in your layouts and add the
following to your Mongrel configuration script:

  uri '/', :handler => ::UploadProgress::MonitorHandler.new, :in_front => true
  uri '/upload_progress', :handler => ::UploadProgress::StatusHandler.new
}
