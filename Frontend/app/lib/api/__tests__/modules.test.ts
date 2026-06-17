import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import api from "../client";
import { userApi } from "../user";
import { settingsApi } from "../settings";
import { tiresApi } from "../tires";
import { ridesApi } from "../rides";
import { challengesApi } from "../challenges";
import { eventsApi } from "../events";
import { labApi } from "../lab";
import { coachApi } from "../coach";

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("userApi connection wiring", () => {
  it("getMe -> GET /users/me", async () => {
    await userApi.getMe();
    expect(mockedApi.get).toHaveBeenCalledWith("/users/me");
  });

  it("patchMe -> PATCH /users/me", async () => {
    await userApi.patchMe({ name: "Alex" });
    expect(mockedApi.patch).toHaveBeenCalledWith("/users/me", { name: "Alex" });
  });

  it("getBike -> GET /users/me/bike", async () => {
    await userApi.getBike();
    expect(mockedApi.get).toHaveBeenCalledWith("/users/me/bike");
  });

  it("patchBike -> PATCH /users/me/bike", async () => {
    await userApi.patchBike({ brand: "Trek" });
    expect(mockedApi.patch).toHaveBeenCalledWith("/users/me/bike", { brand: "Trek" });
  });

  it("getStats -> GET /users/me/stats", async () => {
    await userApi.getStats();
    expect(mockedApi.get).toHaveBeenCalledWith("/users/me/stats");
  });

  it("submitOnboarding -> POST /users/onboarding", async () => {
    const body = { bike: {}, tires: {} } as any;
    await userApi.submitOnboarding(body);
    expect(mockedApi.post).toHaveBeenCalledWith("/users/onboarding", body);
  });
});

describe("settingsApi connection wiring", () => {
  it("getNotifications -> GET /settings/notifications", async () => {
    await settingsApi.getNotifications();
    expect(mockedApi.get).toHaveBeenCalledWith("/settings/notifications");
  });

  it("patchNotifications -> PATCH /settings/notifications", async () => {
    await settingsApi.patchNotifications({ enabled: false });
    expect(mockedApi.patch).toHaveBeenCalledWith("/settings/notifications", { enabled: false });
  });

  it("getStrava -> GET /settings/strava", async () => {
    await settingsApi.getStrava();
    expect(mockedApi.get).toHaveBeenCalledWith("/settings/strava");
  });

  it("getStravaAuthorizeUrl -> GET /settings/strava/authorize-url", async () => {
    await settingsApi.getStravaAuthorizeUrl();
    expect(mockedApi.get).toHaveBeenCalledWith("/settings/strava/authorize-url");
  });

  it("exchangeStravaCode -> POST /settings/strava/exchange with code", async () => {
    await settingsApi.exchangeStravaCode("abc");
    expect(mockedApi.post).toHaveBeenCalledWith("/settings/strava/exchange", { code: "abc" });
  });

  it("syncStrava -> POST /settings/strava/sync", async () => {
    await settingsApi.syncStrava();
    expect(mockedApi.post).toHaveBeenCalledWith("/settings/strava/sync");
  });

  it("disconnectStrava -> DELETE /settings/strava/disconnect", async () => {
    await settingsApi.disconnectStrava();
    expect(mockedApi.delete).toHaveBeenCalledWith("/settings/strava/disconnect");
  });

  it("getStravaClubs -> GET /settings/strava/clubs", async () => {
    await settingsApi.getStravaClubs();
    expect(mockedApi.get).toHaveBeenCalledWith("/settings/strava/clubs");
  });

  it("getStravaClubMembers -> GET /settings/strava/clubs/{id}/members", async () => {
    await settingsApi.getStravaClubMembers(42);
    expect(mockedApi.get).toHaveBeenCalledWith("/settings/strava/clubs/42/members");
  });
});

describe("tiresApi connection wiring", () => {
  it("getTires -> GET /tires", async () => {
    await tiresApi.getTires();
    expect(mockedApi.get).toHaveBeenCalledWith("/tires");
  });

  it("getTire -> GET /tires/{wheel}", async () => {
    await tiresApi.getTire("front");
    expect(mockedApi.get).toHaveBeenCalledWith("/tires/front");
  });

  it("updateTire -> PATCH /tires/{wheel}", async () => {
    await tiresApi.updateTire("rear", { brand: "michelin", catalog_id: "x" } as any);
    expect(mockedApi.patch).toHaveBeenCalledWith("/tires/rear", { brand: "michelin", catalog_id: "x" });
  });

  it("getCatalog -> GET /tires/catalog without params when type omitted", async () => {
    await tiresApi.getCatalog();
    expect(mockedApi.get).toHaveBeenCalledWith("/tires/catalog", { params: {} });
  });

  it("getCatalog -> GET /tires/catalog with type param", async () => {
    await tiresApi.getCatalog("Gravel");
    expect(mockedApi.get).toHaveBeenCalledWith("/tires/catalog", { params: { type: "Gravel" } });
  });

  it("getCatalogItem -> GET /tires/catalog/{id}", async () => {
    await tiresApi.getCatalogItem("power-cup");
    expect(mockedApi.get).toHaveBeenCalledWith("/tires/catalog/power-cup");
  });

  it("getWearHistory -> GET /tires/wear-history with default days=30", async () => {
    await tiresApi.getWearHistory();
    expect(mockedApi.get).toHaveBeenCalledWith("/tires/wear-history", { params: { days: 30 } });
  });

  it("getWearHistory -> GET /tires/wear-history with explicit days", async () => {
    await tiresApi.getWearHistory(90);
    expect(mockedApi.get).toHaveBeenCalledWith("/tires/wear-history", { params: { days: 90 } });
  });

  it("getRecommendations -> GET /tires/recommendations", async () => {
    await tiresApi.getRecommendations();
    expect(mockedApi.get).toHaveBeenCalledWith("/tires/recommendations");
  });
});

describe("ridesApi connection wiring", () => {
  it("getRides -> GET /rides with params", async () => {
    await ridesApi.getRides({ limit: 5, days: 30 });
    expect(mockedApi.get).toHaveBeenCalledWith("/rides", { params: { limit: 5, days: 30 } });
  });

  it("getRides -> GET /rides without params", async () => {
    await ridesApi.getRides();
    expect(mockedApi.get).toHaveBeenCalledWith("/rides", { params: undefined });
  });

  it("getRide -> GET /rides/{id}", async () => {
    await ridesApi.getRide(42);
    expect(mockedApi.get).toHaveBeenCalledWith("/rides/42");
  });
});

describe("challengesApi connection wiring", () => {
  it("getActive -> GET /challenges", async () => {
    await challengesApi.getActive();
    expect(mockedApi.get).toHaveBeenCalledWith("/challenges");
  });

  it("getPast -> GET /challenges/past", async () => {
    await challengesApi.getPast();
    expect(mockedApi.get).toHaveBeenCalledWith("/challenges/past");
  });

  it("getChallenge -> GET /challenges/{id}", async () => {
    await challengesApi.getChallenge(7);
    expect(mockedApi.get).toHaveBeenCalledWith("/challenges/7");
  });
});

describe("eventsApi connection wiring", () => {
  it("list -> GET /events", async () => {
    await eventsApi.list();
    expect(mockedApi.get).toHaveBeenCalledWith("/events");
  });

  it("get -> GET /events/{id}", async () => {
    await eventsApi.get(3);
    expect(mockedApi.get).toHaveBeenCalledWith("/events/3");
  });

  it("create -> POST /events", async () => {
    const body = { name: "Défi" } as any;
    await eventsApi.create(body);
    expect(mockedApi.post).toHaveBeenCalledWith("/events", body);
  });

  it("join -> POST /events/{id}/join", async () => {
    await eventsApi.join(3);
    expect(mockedApi.post).toHaveBeenCalledWith("/events/3/join");
  });
});

describe("labApi connection wiring", () => {
  it("listTrials -> GET /lab/trials", async () => {
    await labApi.listTrials();
    expect(mockedApi.get).toHaveBeenCalledWith("/lab/trials");
  });

  it("enter -> POST /lab/trials/{id}/enter", async () => {
    await labApi.enter(5);
    expect(mockedApi.post).toHaveBeenCalledWith("/lab/trials/5/enter");
  });
});

describe("coachApi connection wiring", () => {
  it("getTips -> GET /coach/tips", async () => {
    await coachApi.getTips();
    expect(mockedApi.get).toHaveBeenCalledWith("/coach/tips");
  });
});
