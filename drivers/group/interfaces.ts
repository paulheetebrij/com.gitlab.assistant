/* eslint-disable node/no-unsupported-features/es-syntax */
/**
 * @interface
 * @property {string} gitlab url of gitlab instance. Default is https://gitlab.com/
 * @property {string} token access token with sufficient api permissions
 * @property {string} group id of gitlab-group
 */
export interface GroupConnectRequest {
  gitlab: string;
  token: string;
  group: number;
}

/**
 * @interface
 * @property {boolean} credentialsAreValid
 * @property {string} [name] Name of the group
 * @property {string} [id] id of the group connection
 */
export interface GroupConnectResponse {
  credentialsAreValid: boolean;
  name?: string;
  id?: string;
}

/**
 * @interface
 * @property {function(GroupConnectRequest): Promise<GroupConnectResponse>} connect Checks credentials and validity of group connection settings
 */
export interface GroupConnector {
  connect(data: GroupConnectRequest): Promise<GroupConnectResponse>;
}
