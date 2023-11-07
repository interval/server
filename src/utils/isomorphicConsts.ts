// consts that can safely be imported in the browser or server (eg. not secrets)
export const AUTH_COOKIE_NAME = 'interval_auth_cookie'
export const REFERRAL_LOCAL_STORAGE_KEY = '__INTERVAL_REFERRAL_INFO'
export const ME_LOCAL_STORAGE_KEY = '__INTERVAL_ME'
export const INTERVAL_USAGE_ENVIRONMENT = '__INTERVAL_USAGE_ENVIRONMENT'
export const TRANSACTION_ID_SEARCH_PARAM_KEY = '__INTERVAL_TRANSACTION_ID'
export const SLACK_OAUTH_SCOPES =
  'im:write,chat:write,channels:read,groups:read,users:read,users:read.email'
export const CLIENT_ISOCKET_ID_SEARCH_PARAM_KEY = '__INTERVAL_CLIENT_ISOCKET_ID'

export const NODE_SDK_NAME = '@interval/sdk'
export const PYTHON_SDK_NAME = 'interval-py'
