require 'test/unit'
require 'tmpdir'

require 'rubygems'
require 'mocha'

RAILS_ROOT = Dir::tmpdir
require 'upload_progress'

class UploadProgressTest < Test::Unit::TestCase
  def setup
    FileUtils.rm_rf(UploadProgress::PROGRESS_DIRECTORY)
  end

  def test_module_properly_loaded
    assert defined?(UploadProgress)
  end

  def test_progress_recorded_by_monitor_handler
    monitor = UploadProgress::MonitorHandler.new
    assert_nil UploadProgress.get('test')
    monitor.request_progress({'QUERY_STRING' => 'upload_id=test'}, 314, 1592)
    assert_equal({:remaining => 314, :total => 1592}, UploadProgress.get('test'))
    assert_nil UploadProgress.get('other')
  end

  def test_cleanup_removes_old_status_information
    monitor = UploadProgress::MonitorHandler.new
    monitor.request_progress({'QUERY_STRING' => 'upload_id=test'}, 314, 1592)
    UploadProgress.cleanup
    assert_not_nil UploadProgress.get('test')
    File.expects(:stat).returns(mock(:mtime => 1.week.ago))
    UploadProgress.cleanup
    assert_nil UploadProgress.get('test')
  end
end
