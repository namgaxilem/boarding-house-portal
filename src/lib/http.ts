'use client';
import axios from 'axios';
import { deleteCookie, getCookie } from 'cookies-next';

export const axiosInstance = axios.create({
  headers: {},
});
axiosInstance.defaults.withCredentials = true;

axiosInstance.interceptors.request.use(function (config) {
  const token = getCookie('Authorization');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response.status === 401) {
      deleteCookie('Authorization');
    }
    throw error;
  }
);

export const http = {
  get: function get<Response = unknown>(url: string) {
    return axiosInstance.get<Response>(url).then((res) => res?.data);
  },
  post: function post<Request = unknown, Response = unknown>(url: string, data?: Request) {
    return axiosInstance.post<Response>(url, data).then((res) => res?.data);
  },
  del: function del<Response = unknown>(url: string) {
    return axiosInstance.delete<Response>(url).then((res) => res?.data);
  },
  put: function put<Request = unknown, Response = unknown>(url: string, data?: Request) {
    return axiosInstance.put<Response>(url, data).then((res) => res?.data);
  },
  patch: function patch<Request = unknown, Response = unknown>(url: string, data?: Request) {
    return axiosInstance.patch<Response>(url, data).then((res) => res?.data);
  },
};
