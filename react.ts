"use client";

// @deno-types="npm:@types/react"
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useSyncExternalStore,
} from "npm:react";

import {
    FeatureFlags,
    FeatureFlagSchema,
    Overrides,
    TFeatureFlags,
} from "./mod.ts";

type State<
    Environment extends string,
    Schema extends FeatureFlagSchema,
> = {
    featureFlags: FeatureFlags<Environment, Schema>;
    state: TFeatureFlags<Schema>;
};

// deno-lint-ignore no-explicit-any
export const FeatureFlagContext = createContext<State<any, any>>({
    featureFlags: new FeatureFlags({ schema: {} }),
    state: {},
});

export function FeatureFlagProvider<
    Environment extends string,
    Schema extends FeatureFlagSchema,
>({ children, hydratedOverrides, ...options }: {
    featureFlags: FeatureFlags<Environment, Schema>;
    options?: never;
    hydratedOverrides?: Overrides<Schema>;
    children: ReactNode;
} | {
    featureFlags?: never;
    options: ConstructorParameters<typeof FeatureFlags<Environment, Schema>>[0];
    hydratedOverrides?: Overrides<Schema>;
    children: ReactNode;
}) {
    const featureFlags = options.featureFlags ||
        new FeatureFlags<Environment, Schema>(options.options);

    const state = useSyncExternalStore<TFeatureFlags<Schema>>(
        (listener) => {
            featureFlags.subscribe(listener);
            return () => featureFlags.unsubscribe(listener);
        },
        () => ({ ...featureFlags.store }),
    );

    const value = { featureFlags, state };

    useEffect(() => {
        if (!hydratedOverrides) return;
        const flags = FeatureFlags.listOptionsFromSchema(featureFlags.schema);
        flags.forEach((flag) => {
            const override = hydratedOverrides(flag);
            if (FeatureFlags.isValidValue(override)) {
                try {
                    featureFlags.set(flag, override);
                } catch (_e) {
                    /* ignore readonly errors here */
                }
            }
        });
    }, []);

    return FeatureFlagContext.Provider({ value, children });
}

// deno-lint-ignore no-explicit-any
export function useFeatureFlags<Schema extends FeatureFlagSchema = any>(
    _: { schema: Schema },
) {
    const { featureFlags, state } = useContext(FeatureFlagContext) as State<
        "",
        Schema
    >;

    function setState(updates: Partial<TFeatureFlags<Schema>>) {
        const flags = Object.keys(updates) as (keyof typeof updates)[];
        flags.forEach((flag) => {
            const v = updates[flag];
            if (FeatureFlags.isValidValue(v)) {
                featureFlags.set(flag, v);
            }
        });
    }

    return [state, setState];
}
