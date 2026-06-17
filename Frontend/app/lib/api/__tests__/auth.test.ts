import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client", async () => {
  const actual = await vi.importActual<typeof import("../client")>("../client");
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
    getAuthToken: vi.fn(),
  };
});

import api, { setAuthToken, clearAuthToken, getAuthToken } from "../client";
import { authApi } from "../auth";

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

describe("authApi connection wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("register POSTs /auth/register and stores the returned token", async () => {
    mockedApi.post.mockResolvedValue({ data: { token: "new-token", user: {} } });
    await authApi.register({ email: "a@b.com", password: "password123", name: "A" } as any);
    expect(mockedApi.post).toHaveBeenCalledWith("/auth/register", {
      email: "a@b.com",
      password: "password123",
      name: "A",
    });
    expect(setAuthToken).toHaveBeenCalledWith("new-token");
  });

  it("login POSTs /auth/login and stores the returned token", async () => {
    mockedApi.post.mockResolvedValue({ data: { token: "login-token", user: {} } });
    await authApi.login({ email: "a@b.com", password: "password123" } as any);
    expect(mockedApi.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@b.com",
      password: "password123",
    });
    expect(setAuthToken).toHaveBeenCalledWith("login-token");
  });

  it("getStravaLoginAuthorizeUrl GETs /auth/strava/authorize-url", async () => {
    mockedApi.get.mockResolvedValue({ data: { url: "https://strava.example" } });
    await authApi.getStravaLoginAuthorizeUrl();
    expect(mockedApi.get).toHaveBeenCalledWith("/auth/strava/authorize-url");
  });

  it("loginWithStrava POSTs /auth/strava with the code and stores the token", async () => {
    mockedApi.post.mockResolvedValue({ data: { token: "strava-token", user: {} } });
    await authApi.loginWithStrava("code-abc");
    expect(mockedApi.post).toHaveBeenCalledWith("/auth/strava", { code: "code-abc" });
    expect(setAuthToken).toHaveBeenCalledWith("strava-token");
  });

  it("logout POSTs /auth/logout and always clears the token, even on failure", async () => {
    mockedApi.post.mockRejectedValue(new Error("network error"));
    await expect(authApi.logout()).rejects.toThrow("network error");
    expect(mockedApi.post).toHaveBeenCalledWith("/auth/logout");
    expect(clearAuthToken).toHaveBeenCalled();
  });

  it("logout clears the token on success too", async () => {
    mockedApi.post.mockResolvedValue({ data: null });
    await authApi.logout();
    expect(clearAuthToken).toHaveBeenCalled();
  });

  it("me GETs /auth/me", async () => {
    mockedApi.get.mockResolvedValue({ data: { id: 1 } });
    await authApi.me();
    expect(mockedApi.get).toHaveBeenCalledWith("/auth/me");
  });

  it("hasToken reflects whether a token is currently stored", () => {
    (getAuthToken as ReturnType<typeof vi.fn>).mockReturnValue("present");
    expect(authApi.hasToken()).toBe(true);

    (getAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(authApi.hasToken()).toBe(false);
  });
});
