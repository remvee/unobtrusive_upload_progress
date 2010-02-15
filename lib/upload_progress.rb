require 'rubygems'
require 'mongrel'
require 'active_support'

module UploadProgress
  # Simple upload progress handler.  Sits before all Rails requests
  # and registers progress for request with param_name in the
  # query-string.
  class MonitorHandler < Mongrel::HttpHandler
    def initialize
      @request_notify = true
      UploadProgress.monitor_instanciated = true
      UploadProgress.setup
    end

    # Register progress.
    def request_progress(params, remaining, total)
      if id = Mongrel::HttpRequest.query_parse(params['QUERY_STRING'])[UploadProgress.param_name]
        UploadProgress.put(id, :remaining => remaining, :total => total)
      end
    end
  end

  # Simple handler to report upload progress.
  class StatusHandler < Mongrel::HttpHandler
    def process(request, response)
      response.start(200) do |head,out|
        head['Content-Type'] = "application/json"
        out << UploadProgress.get(request.params['QUERY_STRING']).to_json
      end
    end
  end

  class << self
    cattr_accessor :monitor_instanciated, :param_name, :progress_directory, :sweeper_interval

    self.param_name = 'upload_progress_id'
    self.progress_directory = "#{RAILS_ROOT}/tmp/upload_progress"
    self.sweeper_interval = 1.hour

    # Returns true when an instance of the monitor handler exists.
    def monitor_loaded?
      monitor_instanciated
    end

    # Get progress status.
    def get(id)
      Marshal.load(File.read(upload_status_file(id))) rescue nil
    end

    # Store progress status.
    def put(id, data)
      open(upload_status_file(id), "w"){|out| out.write(Marshal.dump(data))}
    end

    # Cleanup old statuses.
    def cleanup
      Dir["#{progress_directory}/*"].select do |fname|
        File.stat(fname).mtime < 1.days.ago
      end.each do |fname|
        File.delete(fname)
      end
    end

    # Setup status directory and spawn sweeper.
    def setup
      FileUtils.mkdir_p(progress_directory)

      # Only allow one sweeper to be started.
      return unless File.new(progress_directory).flock(File::LOCK_EX | File::LOCK_NB)

      sweeper = Thread.new do
        loop do
          cleanup
          sleep sweeper_interval.to_i
        end
      end
      sweeper.priority = -1
    end

  private
    def upload_status_file(id)
      File.join(progress_directory, id)
    end
  end
end

