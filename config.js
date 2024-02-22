require('dotenv').config()

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  GET_NEW_REPORTS_INTERVAL: process.env.GET_READY_REQUESTS_INTERVAL || 1000,
  RUN_READY_REPORTS_INTERVAL: process.env.RUN_READY_REQUESTS_INTERVAL || 1000,
  COUNTY_OU: process.env.COUNTY_OU,
  MONGODB: {
    CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
    DB_NAME: process.env.MONGODB_DB_NAME,
    REPORT_COLLECTION: process.env.MONGODB_REPORT_COLLECTION,
    USERS_COLLECTION: process.env.MONGODB_USERS_COLLECTION
  },
  APPREG: {
    CLIENT_ID: process.env.APPREG_CLIENT_ID,
    CLIENT_SECRET: process.env.APPREG_CLIENT_SECRET,
    TENANT_ID: process.env.APPREG_TENANT_ID,
    TENANT_NAME: process.env.APPREG_TENANT_NAME
  },
  APPREG_VTFK: {
    CLIENT_ID: process.env.APPREG_VTFK_CLIENT_ID,
    CLIENT_SECRET: process.env.APPREG_VTFK_CLIENT_SECRET,
    TENANT_ID: process.env.APPREG_VTFK_TENANT_ID,
    TENANT_NAME: process.env.APPREG_VTFK_TENANT_NAME
  },
  GRAPH: {
    SCOPE: process.env.GRAPH_SCOPE || 'https://graph.microsoft.com/.default',
    URL: process.env.GRAPH_URL || 'https://graph.microsoft.com'
  },
  FINTFOLK: {
    SCOPE: process.env.FINTFOLK_SCOPE,
    URL: process.env.FINTFOLK_URL
  },
  VISMA: {
    COMPANY_ID: process.env.VISMA_COMPANY_ID || '1',
    CATEGORIES: process.env.VISMA_CATEGORIES || 'O,SE,TK,X,XA,XB,FW'
  },
  FEIDE: {
    PRINCIPAL_NAME: process.env.FEIDE_PRINCIPAL_NAME || '@vtfk.no'
  },
  PS1_SCRIPTS_PATH: process.env.PS1_SCRIPTS_PATH || 'D:/DUST-TEST/duste-kvern/scripts',
  MAX_BUFFER: process.env.MAX_BUFFER || 1024 * 10000
}
