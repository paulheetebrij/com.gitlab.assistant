/* eslint-disable */
import sourceMapSupport from 'source-map-support';
import Homey from 'homey';
sourceMapSupport.install();
class GitLabApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit(): Promise<void> {
    this.log('GitLab App has been initialized');
  }
}

module.exports = GitLabApp;
