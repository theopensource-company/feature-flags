# Feature Flags

This package contains abstraction of logic to handle feature flags.

[![](https://img.shields.io/badge/license-Apache_License_2.0-00bfff.svg?style=flat-square)](https://github.com/theopensource-company/feature-flags)
[![](https://img.shields.io/npm/v/@theopensource-company/feature-flags?style=flat-square)](https://www.npmjs.com/package/@theopensource-company/feature-flags)
[![](https://img.shields.io/npm/v/@theopensource-company/feature-flags?style=flat-square&label=deno)](https://deno.land/x/featureflags)

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

## Use with React.js

This library exposes a provider and a hook to use this library in a reactive
manner with React.js. The below snippets give an example as to how you _could_
implement this library. It might differ for your usecase.

#### `feature-flags.ts`

This file contains all configuration for the feature flags

```ts
import React, { type ReactNode } from "react";
import { FeatureFlags } from "@theopensource-company/feature-flags";
import { featureFlagsHookFactory } from "@theopensource-company/feature-flags/react";

export const featureFlags = new FeatureFlags({
    schema: {
        test: {
            options: [true, false],
        },
    },
});

// By passing the FeatureFlags instance, the factory will automatically inherit types from the schema.
export const useFeatureFlags = featureFlagsHookFactory(featureFlags);
```

#### `providers.tsx`

Some file which renders only on the client. Usually a central place in react
applications to wrap all providers in one place.

```tsx
import React from "react";
import { featureFlags } from "feature-flags.ts";
import { FeatureFlagProvider } from "@theopensource-company/feature-flags/react";

export default function Providers(
    { children }: { children: ReactNode },
) {
    return (
        <FeatureFlagProvider featureFlags={featureFlags}>
            {children}
        </FeatureFlagProvider>
    );
}
```

#### `some-page.tsx`

Some page which needs feature flags

```tsx
import { useFeatureFlags } from "feature-flags.ts";

export default function Page() {
    const [flags, setFlags] = useFeatureFlags();

    return (
        <>
            <label htmlFor="test">
                Test enabled
            </label>
            <input
                id="test"
                type="checkbox"
                checked={flags.test}
                onChange={() =>
                    setFlags({
                        test: !flags.test,
                    })}
            />
        </>
    );
}
```

## Use with Vue.js

This library exposes a hook to use this library in a reactive manner with
Vue.js. The below snippets give an example as to how you _could_ implement this
library. It might differ for your usecase.

#### `feature-flags.ts`

This file contains all configuration for the feature flags

```ts
import { FeatureFlags } from "@theopensource-company/feature-flags";
import { featureFlagsHookFactory } from "@theopensource-company/feature-flags/vue";

export const featureFlags = new FeatureFlags({
    schema: {
        test: {
            options: [true, false],
        },
    },
});

export const useFeatureFlags = featureFlagsHookFactory(featureFlags);
```

#### `SomePage.vue`

Some page which needs feature flags

```html
<script>
    import { useFeatureFlags } from 'feature-flags.ts';
    const [flags, setFlags] = useFeatureFlags();
</script>

<template>
    <button v-on:click="setFlags({ test: !flags.test })">
        {{ flags.toString() }}
    </button>
</template>
```
