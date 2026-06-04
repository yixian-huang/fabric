import request from './request';

export interface SetupStatus {
  setup_required: boolean;
  user_count: number;
  storage_mode: string;
  database_mode: string;
  restart_required: boolean;
  storage: {
    mode: string;
    options: string[];
    endpoint?: string;
    bucket?: string;
    local_path?: string;
  };
  database: {
    mode: string;
    options: string[];
    host?: string;
    name?: string;
  };
  bootstrap: {
    username: string;
    has_default_password: boolean;
    default_password_hint: string;
  };
}

export interface SetupCompletePayload {
  admin_password: string;
  admin_password_confirm: string;
  storage_mode: string;
  database_mode: string;
  storage: {
    endpoint?: string;
    access_key?: string;
    secret_key?: string;
    bucket?: string;
    secure?: boolean;
    local_path?: string;
  };
  database: {
    dsn?: string;
    host?: string;
    port?: number;
    name?: string;
    user?: string;
    password?: string;
  };
}

export function getSetupStatus() {
  return request<{ data: SetupStatus }>({
    url: '/base/setup/status',
    method: 'get',
  });
}

export function completeSetup(data: SetupCompletePayload) {
  return request({
    url: '/base/setup/complete',
    method: 'post',
    data,
  });
}
