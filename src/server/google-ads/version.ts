


export const GOOGLE_ADS_API_VERSION = 'v23'

const BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`

export const oauthTokenUrl = 'https://oauth2.googleapis.com/token'


export const endpointListCustomers = () => `${BASE}/customers:listAccessibleCustomers`


export const endpointSearchStream = (customerId: string) =>
  `${BASE}/customers/${customerId}/googleAds:searchStream`
