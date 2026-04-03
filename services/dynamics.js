const msal = require('@azure/msal-node');

class DynamicsService {
  constructor() {
    this.tenantId = process.env.DYNAMICS_TENANT_ID;
    this.clientId = process.env.DYNAMICS_CLIENT_ID;
    this.clientSecret = process.env.DYNAMICS_CLIENT_SECRET;
    this.environmentUrl = process.env.DYNAMICS_ENVIRONMENT_URL;

    this.msalClient = new msal.ConfidentialClientApplication({
      auth: {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
      },
    });

    this.tokenCache = null;
  }

  async getAccessToken() {
    if (this.tokenCache && this.tokenCache.expiresOn > new Date()) {
      return this.tokenCache.accessToken;
    }

    const result = await this.msalClient.acquireTokenByClientCredential({
      scopes: [`${this.environmentUrl}/.default`],
    });

    this.tokenCache = result;
    return result.accessToken;
  }

  async request(method, endpoint, data) {
    const token = await this.getAccessToken();
    const url = `${this.environmentUrl}/api/data/v9.2/${endpoint}`;

    const fetch = require('node-fetch');
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
        Prefer: 'odata.include-annotations="*"',
      },
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (response.status === 204) return null;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dynamics API ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  async patch(endpoint, data) {
    return this.request('PATCH', endpoint, data);
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  async testConnection() {
    const result = await this.get('WhoAmI');
    return result;
  }
}

module.exports = new DynamicsService();
