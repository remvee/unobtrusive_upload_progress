require 'rubygems'
require 'mongrel'
require 'activesupport'

module UploadProgress
  PROGRESS_DIRECTORY = "#{RAILS_ROOT}/tmp/upload_progress"

  # Simple upload progress handler.  Sits before all Rails requests and
  # registers progress for request with +upload_id+ in the query-string.
  class MonitorHandler < Mongrel::HttpHandler
    def initialize
      @request_notify = true

      UploadProgress.monitor_instanciated = true
      FileUtils.mkdir_p(PROGRESS_DIRECTORY) unless File.directory?(PROGRESS_DIRECTORY)
    end

    # Register progress.
    def request_progress(params, remaining, total)
      if upload_id = Mongrel::HttpRequest.query_parse(params['QUERY_STRING'])['upload_id']
        UploadProgress.put(upload_id, :remaining => remaining, :total => total)
      end
    end
  end

  # Simple handler to report upload progress.
  class StatusHandler < Mongrel::HttpHandler
    def process(request, response)
      upload_id = Mongrel::HttpRequest.query_parse(request.params['QUERY_STRING'])['upload_id']

      response.start(200) do |head,out|
        head['Content-Type'] = "application/json"
        out << UploadProgress.get(upload_id).to_json
      end
    end
  end

  class << self
    cattr_accessor :monitor_instanciated

    # Returns true when an instance of the monitor handler exists.
    def monitor_loaded?
      monitor_instanciated
    end

    # Get progress status.
    def get(upload_id)
      Marshal.load(File.read(upload_status_file(upload_id))) rescue nil
    end

    # Store progress status.
    def put(upload_id, data)
      open(upload_status_file(upload_id), "w"){|out| out.write(Marshal.dump(data))}
    end

    # Cleanup old statuses.
    def cleanup
      Dir["#{RAILS_ROOT}/tmp/upload_progress/*"].select do |fname|
        File.stat(fname).mtime < 1.days.ago
      end.each do |fname|
        File.delete(fname)
      end
    end

    private
    def upload_status_file(upload_id)
      File.join(PROGRESS_DIRECTORY, upload_id)
    end
  end
end

