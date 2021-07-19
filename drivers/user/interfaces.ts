/**
 * @module user types
 */
/* eslint-disable node/no-unsupported-features/es-syntax */
/**
 * @interface
 * @property {string} gitlab url of gitlab instance. Default is https://gitlab.com/
 * @property {string} token access token with sufficient api permissions
 */
export interface UserConnectRequest {
  gitlab: string;
  token: string;
}

/**
 * @interface
 * @property {boolean} credentialsAreValid
 * @property {number} [userId] User id
 * @property {string} [name] Name of the user
 * @property {string} [id] generated device id of the user connection
 */
export interface UserConnectResponse {
  credentialsAreValid: boolean;
  userId?: number;
  name?: string;
  id?: string;
}

/**
 * @interface
 * @property {function(UserConnectRequest): Promise<UserConnectResponse>} connect Checks credentials and validity of user connection settings
 */
export interface UserConnector {
  connect(data: UserConnectRequest): Promise<UserConnectResponse>;
}
