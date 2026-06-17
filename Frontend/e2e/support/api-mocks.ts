import type { Page, Route } from "@playwright/test";
import type { BikeOut, UserOut } from "@/app/lib/api";
import {
  activeChallenges,
  authToken,
  catalogTire,
  clubs,
  clubMembers,
  coachTips,
  completedUser,
  events,
  incompleteUser,
  pastChallenges,
  recommendations,
  rides,
  stats,
  stravaDisconnected,
  tires,
  trials,
} from "../fixtures/racelab-fixtures";

const tokenKey = "mbt_auth_token";

interface MockApiOptions {
  user?: UserOut | null;
  loginError?: string;
}

export async function seedAuth(page: Page, token = authToken) {
  await page.addInitScript(
    ([key, value]) => {
      if (window.sessionStorage.getItem("__racelab_e2e_auth_seeded")) return;
      window.localStorage.setItem(key, value);
      window.sessionStorage.setItem("__racelab_e2e_auth_seeded", "true");
    },
    [tokenKey, token],
  );
}

export async function mockApi(page: Page, options: MockApiOptions = {}) {
  let currentUser = options.user === undefined ? completedUser : options.user;
  let currentTires = tires;

  await page.addInitScript(() => {
    const originalError = window.console.error;
    window.console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].startsWith("[API]")) return;
      originalError(...args);
    };
  });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (!isApiRequest(url)) {
      await route.fallback();
      return;
    }

    if (request.method() === "OPTIONS") {
      await respond(route, null, 204);
      return;
    }

    const method = request.method();
    const path = url.pathname;

    if (method === "POST" && path === "/auth/login") {
      if (options.loginError) {
        await respond(route, { detail: options.loginError }, 401);
        return;
      }
      currentUser = completedUser;
      await respond(route, { token: authToken, user: currentUser });
      return;
    }

    if (method === "POST" && path === "/auth/register") {
      currentUser = incompleteUser;
      await respond(route, { token: authToken, user: currentUser });
      return;
    }

    if (method === "POST" && path === "/auth/logout") {
      currentUser = null;
      await respond(route, null, 204);
      return;
    }

    if (method === "GET" && path === "/auth/me") {
      if (!currentUser) {
        await respond(route, { detail: "Not authenticated" }, 401);
        return;
      }
      await respond(route, currentUser);
      return;
    }

    if (method === "POST" && path === "/users/onboarding") {
      const body = postData(route);
      currentUser = {
        ...completedUser,
        name: currentUser?.name ?? completedUser.name,
        email: currentUser?.email ?? completedUser.email,
        username: currentUser?.username ?? completedUser.username,
        city: stringValue(body.city, "Lyon"),
        onboarding_completed: true,
        bike: {
          ...completedUser.bike,
          brand: stringValue(body.bike_brand, completedUser.bike.brand),
          model: stringValue(body.bike_model, completedUser.bike.model),
          year: numberValue(body.bike_year, completedUser.bike.year),
        },
      };
      await respond(route, currentUser);
      return;
    }

    if (method === "GET" && path === "/users/me") {
      await respond(route, currentUser ?? completedUser);
      return;
    }

    if (method === "PATCH" && path === "/users/me") {
      currentUser = {
        ...(currentUser ?? completedUser),
        ...postData(route),
      };
      await respond(route, currentUser);
      return;
    }

    if (method === "GET" && path === "/users/me/bike") {
      await respond(route, (currentUser ?? completedUser).bike);
      return;
    }

    if (method === "PATCH" && path === "/users/me/bike") {
      const updatedBike: BikeOut = {
        ...(currentUser ?? completedUser).bike,
        ...postData(route),
      };
      currentUser = {
        ...(currentUser ?? completedUser),
        bike: updatedBike,
      };
      await respond(route, updatedBike);
      return;
    }

    if (method === "GET" && path === "/users/me/stats") {
      await respond(route, stats);
      return;
    }

    if (method === "GET" && path === "/tires") {
      await respond(route, currentTires);
      return;
    }

    if (method === "GET" && path === "/tires/catalog") {
      await respond(route, [catalogTire]);
      return;
    }

    if (method === "GET" && path.startsWith("/tires/catalog/")) {
      await respond(route, catalogTire);
      return;
    }

    if (method === "GET" && path === "/tires/recommendations") {
      await respond(route, recommendations);
      return;
    }

    if (method === "PATCH" && path.startsWith("/tires/")) {
      const wheel = path.endsWith("/front") ? "front" : "rear";
      const patch = postData(route);
      const updated = {
        ...currentTires[wheel],
        ...patch,
        wheel,
        wear_pct: patch.reset_wear === true ? 0 : currentTires[wheel].wear_pct,
      };
      currentTires = { ...currentTires, [wheel]: updated };
      await respond(route, updated);
      return;
    }

    if (method === "GET" && path === "/rides") {
      await respond(route, rides);
      return;
    }

    if (method === "GET" && path === "/challenges") {
      await respond(route, activeChallenges);
      return;
    }

    if (method === "GET" && path === "/challenges/past") {
      await respond(route, pastChallenges);
      return;
    }

    if (method === "GET" && path === "/events") {
      await respond(route, events);
      return;
    }

    if (method === "POST" && path === "/events") {
      const created = { ...events[0], id: 999, ...postData(route), joined: true };
      await respond(route, created);
      return;
    }

    if (method === "POST" && path.startsWith("/events/") && path.endsWith("/join")) {
      await respond(route, { ...events[0], joined: true });
      return;
    }

    if (method === "GET" && path === "/lab/trials") {
      await respond(route, trials);
      return;
    }

    if (method === "POST" && path.startsWith("/lab/trials/") && path.endsWith("/enter")) {
      await respond(route, { ...trials[0], entered: true });
      return;
    }

    if (method === "GET" && path === "/coach/tips") {
      await respond(route, coachTips);
      return;
    }

    if (method === "GET" && path === "/settings/strava") {
      await respond(route, stravaDisconnected);
      return;
    }

    if (method === "GET" && path === "/settings/strava/clubs") {
      await respond(route, clubs);
      return;
    }

    if (method === "GET" && path.startsWith("/settings/strava/clubs/")) {
      await respond(route, clubMembers);
      return;
    }

    if (method === "GET" && path.endsWith("/authorize-url")) {
      await respond(route, { authorize_url: "https://www.strava.com/oauth/authorize?client_id=e2e" });
      return;
    }

    await respond(route, { detail: `Unhandled mocked API route: ${method} ${path}` }, 500);
  });
}

function isApiRequest(url: URL) {
  return (
    (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
    url.port === "8000"
  );
}

function postData(route: Route) {
  return route.request().postDataJSON() as Record<string, unknown>;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

async function respond(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "authorization,content-type,accept",
      "content-type": "application/json",
    },
    body: body === null ? "" : JSON.stringify(body),
  });
}
