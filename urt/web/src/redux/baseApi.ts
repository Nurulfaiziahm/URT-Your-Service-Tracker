import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery,
  tagTypes: [
    'Profile:ME',
    'Devices:ME',
    'Membership:ME',
    'Business',
    'Technicians',
    'Customers',
    'Services',
    'Tickets',
    'Dashboard',
    'Invoices',
    'Reports',
  ],
  endpoints: () => ({}),
});
