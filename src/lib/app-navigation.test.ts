import { describe, expect, test } from "bun:test";
import { createMemoryHistory } from "@tanstack/history";
import { createAppNavigation } from "./app-navigation";

describe("Home and Back", () => {
  test("Back returns to the previous app screen", () => {
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const nav = createAppNavigation(history, (href) => history.replace(href));
    history.push("/shopping-list");
    history.push("/saved");
    nav.back();
    expect(history.location.pathname).toBe("/shopping-list");
    nav.dispose();
  });
  test("Back at direct entry returns Home instead of leaving the app", () => {
    const history = createMemoryHistory({ initialEntries: ["/saved"] });
    const nav = createAppNavigation(history, (href) => history.replace(href));
    nav.back();
    expect(history.location.pathname).toBe("/");
    nav.dispose();
  });
  test("missing history index falls back Home", () => {
    const history = createMemoryHistory({ initialEntries: ["/saved"] });
    Object.assign(history.location.state, { __TSR_index: undefined });
    const nav = createAppNavigation(history, (href) => history.replace(href));
    nav.back();
    expect(history.location.pathname).toBe("/");
    nav.dispose();
  });
  test("Home always returns to the main screen", () => {
    const history = createMemoryHistory({ initialEntries: ["/saved"] });
    const nav = createAppNavigation(history, (href) => history.replace(href));
    nav.home();
    expect(history.location.pathname).toBe("/");
    nav.dispose();
  });
  test("an ignored native Back recovers to the previous screen with its query", async () => {
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const nav = createAppNavigation(history, (href) => history.replace(href));
    history.push("/search?q=rice");
    history.push("/saved");
    history.back = () => {};
    nav.back();
    await new Promise((resolve) => setTimeout(resolve, 750));
    expect(history.location.href).toBe("/search?q=rice");
    nav.dispose();
  });
});