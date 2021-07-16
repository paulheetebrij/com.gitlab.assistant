/* eslint-disable node/no-unsupported-features/es-syntax */
/**
 * @interface
 * @property {string} gitlab url of gitlab instance. Default is https://gitlab.com/
 * @property {string} token access token with sufficient api permissions
 * @property {string} project id of gitlab-project
 */
export interface ProjectConnectRequest {
  gitlab: string;
  token: string;
  project: number;
}

/**
 * @interface
 * @property {boolean} credentialsAreValid
 * @property {string} [name] Name of the project
 * @property {string} [id] id of the project connection
 */
export interface ProjectConnectResponse {
  credentialsAreValid: boolean;
  name?: string;
  id?: string;
}

/**
 * @interface
 * @property {function(ProjectConnectRequest): Promise<ProjectConnectResponse>} connect Checks credentials and validity of project connection settings
 */
export interface ProjectConnector {
  connect(data: ProjectConnectRequest): Promise<ProjectConnectResponse>;
}
