/* eslint-disable */
import Homey from 'homey';
import fetch from 'node-fetch';

interface IGitLabGroup {
  id: string;
  description: string;
  name: string;
  web_url: string;
}
class GitLabGroupDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.addListener('group_issue_closed', async (args) => {
      try {
        const { device, iid, title, link, created_at } = args;
        this.log(
          `Group issue closed ${JSON.stringify({
            iid,
            title,
            link,
            created_at
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('group-issue-closed').trigger(device, {
          iid,
          title,
          created: created_at,
          url: link
        });
      } catch (err) {
        this.error(err);
      }
    });

    this.addListener('group_issue_created', async (args) => {
      try {
        const { device, iid, title, link, created_at } = args;
        this.log(
          `Group issue created ${JSON.stringify({
            iid,
            title,
            link,
            created_at
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('group-issue-created').trigger(device, {
          iid,
          title,
          created: created_at,
          url: link
        });
      } catch (err) {
        this.error(err);
      }
    });

    this.addListener('group_issue_updated', async (args) => {
      try {
        const { device, iid, title, link, created_at } = args;
        this.log(
          `Group issue updated ${JSON.stringify({
            iid,
            title,
            link,
            created_at
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('group-issue-updated').trigger(device, {
          iid,
          title,
          created: created_at,
          url: link
        });
      } catch (err) {
        this.error(err);
      }
    });

    this.log('GitLab group has been initialized');
  }

  async onPair(session: any) {
    session.setHandler(
      'validate_group_settings',
      async (data: {
        gitlab: string;
        group: string;
        token: string;
      }): Promise<{ credentialsAreValid: boolean; name?: string }> => {
        const { gitlab, group, token } = data;
        let headers: any = { Authorization: `Bearer ${token}` };
        const response = await fetch(`${gitlab}/api/v4/groups/${group}`, { headers });
        if (!response.ok) {
          this.log(`Response not ok: ${JSON.stringify(response)}`);
          return { credentialsAreValid: false };
        }
        const currentGroup: any = await response.json();
        return { credentialsAreValid: true, name: currentGroup.name };
      }
    );

    const cardActionAddGroupIssue = this.homey.flow.getActionCard('add-group-issue');
    cardActionAddGroupIssue.registerRunListener(async (args: any) => {
      const { device, title } = args;
      try {
        await device.addIssue(title);
      } catch (err) {
        this.error(err);
      }
    });
  }
}

module.exports = GitLabGroupDriver;
