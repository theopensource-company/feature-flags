import {
    assertEquals,
    assertThrows,
} from "https://deno.land/std@0.201.0/assert/mod.ts";
import { FeatureFlags } from "./mod.ts";

const schema = {
    devTools: {
        options: [false, true],
    },
    migrateDatabase: {
        readonly: true,
        options: [false, true],
    },
    max: {
        options: [2, 4],
    },
} as const;

const options = FeatureFlags.createOptions({
    schema,
    defaults: {
        dev: {
            migrateDatabase: true,
            devTools: true,
            max: 4,
        },
        preview: {
            devTools: true,
        },
    },
});

Deno.test("test defaults", () => {
    console.info("For prod");
    const prod = new FeatureFlags({
        ...options,
        environment: "prod",
    });

    assertEquals(prod.store.max, 2);
    assertEquals(prod.store.migrateDatabase, false);
    assertEquals(prod.store.devTools, false);

    console.info("For dev");
    const dev = new FeatureFlags({
        ...options,
        environment: "dev",
    });

    assertEquals(dev.store.max, 4);
    assertEquals(dev.store.migrateDatabase, true);
    assertEquals(dev.store.devTools, true);

    console.info("For preview");
    const preview = new FeatureFlags({
        ...options,
        environment: "preview",
    });

    assertEquals(preview.store.max, 2);
    assertEquals(preview.store.migrateDatabase, false);
    assertEquals(preview.store.devTools, true);
});

Deno.test("Test updating", () => {
    const prod = new FeatureFlags({
        ...options,
        environment: "prod",
    });

    console.log("Enabling devTools");
    prod.store.devTools = true;
    assertEquals(prod.store.devTools, true);

    console.log("Cannot change migrateDatabase");
    assertThrows(
        () => {
            prod.store.migrateDatabase = true;
        },
        TypeError,
        "'set' on proxy: trap returned falsish for property 'migrateDatabase'",
    );
    assertEquals(prod.store.migrateDatabase, false);
});

Deno.test("Test overrides", () => {
    const prod = new FeatureFlags({
        ...options,
        environment: "prod",
        overrides: (flag) => (({
            max: 4,
            migrateDatabase: true,
            devTools: true,
        } as const)[flag]),
    });

    assertEquals(prod.store.max, 4);
    assertEquals(prod.store.migrateDatabase, false);
    assertEquals(prod.store.devTools, true);
});

Deno.test("Test subscriptions", () => {
    const updates: [unknown, unknown][][] = [[], []];
    const validate = (state: [unknown, unknown][]) =>
        assertEquals(updates, [state, state]);

    const prod = new FeatureFlags({
        ...options,
        environment: "prod",
        subscription: (...args) => updates[0].push(args),
    });

    prod.subscribe((...args) => updates[1].push(args));

    prod.store.max = 4;
    validate([
        ["max", 4],
    ]);

    prod.store.devTools = true;
    validate([
        ["max", 4],
        ["devTools", true],
    ]);

    prod.store.max = 2;
    validate([
        ["max", 4],
        ["devTools", true],
        ["max", 2],
    ]);

    prod.store.devTools = false;
    validate([
        ["max", 4],
        ["devTools", true],
        ["max", 2],
        ["devTools", false],
    ]);
});
