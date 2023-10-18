# Feature Flags

[![](https://img.shields.io/badge/license-Apache_License_2.0-00bfff.svg?style=flat-square)](https://github.com/theopensource-company/feature-flags)
[![](https://img.shields.io/npm/v/@theopensource-company/feature-flags?style=flat-square)](https://www.npmjs.com/package/@theopensource-company/feature-flags)
[![](https://img.shields.io/npm/v/@theopensource-company/feature-flags?style=flat-square&label=deno)](https://deno.land/x/featureflags)

This package contains abstraction of logic to handle feature flags.

## Why?

We use this package across multiple projects. We want an abstract and
standardised way to manage feature flags across applications, and this package
provides that for us.

## Example

```typescript
import { FeatureFlags } from "@theopensource-company/feature-flags";

// Create a schema for your feature flags
const schema = {
    devTools: {
        options: [false, true],
    },
    migrateDatabase: {
        readonly: true,
        options: [false, true],
    },
} as const;

// Create a new feature flags instance
const flags = new FeatureFlags({ schema });

// Read feature flags
flags.store.devTools; // false
flags.get("devTools"); // false

// Update feature flags
flags.store.devTools = true;
flags.set("devTools", true);

// Will throw an error, value is not in schema
flags.store.devTools = 123;

// Will throw an error, flag is readonly
flags.store.migrateDatabase = true;
```

## Writing a schema

```typescript
// Schema's define your feature flags
// Every feature flag must have at least one option
// The first option is always the "schema default"
// You can also pass on defaults per environment. If set, they will overwrite schema defaults
const schema = {
    // You can store booleans, string literals and numbers
    boolean: {
        options: [false, true],
    },
    string: {
        options: ["Hello", "World!"],
    },
    number: {
        options: [123, 456, 789],
    },

    // Or also mix them up
    mixed: {
        options: [1, "String", true],
    },

    // Readonly properties are special
    // Once the default value is set, they can not be overwritten afterwards
    readonly: {
        readonly: true,
        options: [false, true],
    },
} as const;

// Instead of "as const", you can also import the FeatureFlagSchema type and use the satisfied keyword
```

## Environmental defaults

The library accepts defaults per environment. In combination with a passed
environment, the library will prefer these defaults over schema defaults

```typescript
// We are using the static createOptions method here to abstract away the environment that we will need to set.
// This method will simply return the same argument that you passed, but adds the benefit that you can easily type your schema and defaults while being able to reuse them.

const options = FeatureFlags.createOptions({
    schema,
    defaults: {
        dev: {
            migrateDatabase: true,
            preLaunchPage: false,
        },
        preview: {
            preLaunchPage: false,
        },
    },
});
```
