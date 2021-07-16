/* eslint-disable */
import sourceMapSupport from 'source-map-support';
import Homey from 'homey';
sourceMapSupport.install();
/**
 * @template GitLabApp
 * @extends Homey.App
 */
class GitLabApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit(): Promise<void> {
    this.log('GitLab App has been initialized');

    const aCiCdPipelineFails = this.homey.flow.getTriggerCard('a-cicd-pipeline-fails');
    this.addListener('pipeline-fail', async (args: any) => {
      const { id, project_id, project, ref, link, created_at, updated_at } = args;
      await aCiCdPipelineFails.trigger({
        id,
        projectid: project_id,
        project,
        ref,
        link,
        updated: updated_at > created_at ? updated_at : created_at
      });
    });
  }
}

module.exports = GitLabApp;
