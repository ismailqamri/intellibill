"use client";

export const AUTH_TOKEN_KEY = "token";
export const AUTH_USER_KEY = "user";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredUserName() {
  const storedUser = localStorage.getItem(AUTH_USER_KEY);

  if (!storedUser) {
    return "";
  }

  try {
    const user = JSON.parse(storedUser);
    return typeof user?.name === "string" ? user.name : "";
  } catch {
    return "";
  }
}
