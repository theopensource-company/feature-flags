"use client";

// @deno-types="npm:@types/react"
import {
    createContext,
    createElement,
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

// deno-lint-ignore no-explicit-any
export const FeatureFlagContext = createContext<FeatureFlags<any, any>>(
    new FeatureFlags({ schema: {} }),
);

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

    return createElement(FeatureFlagContext.Provider, { value: featureFlags, children });
}

// deno-lint-ignore no-explicit-any
export function featureFlagsHookFactory<Schema extends FeatureFlagSchema = any>(
    _: { schema: Schema },
) {
    return () => {
        const featureFlags = useContext(FeatureFlagContext) as FeatureFlags<
            "",
            Schema
        >;

        const state = useSyncExternalStore<TFeatureFlags<Schema>>(
            (listener) => {
                featureFlags.subscribe(listener);
                return () => featureFlags.unsubscribe(listener);
            },
            () => ({ ...featureFlags.store }),
        );

        function setState(updates: Partial<TFeatureFlags<Schema>>) {
            const flags = Object.keys(updates) as (keyof typeof updates)[];
            flags.forEach((flag) => {
                const v = updates[flag];
                if (FeatureFlags.isValidValue(v)) {
                    featureFlags.set(flag, v);
                }
            });
        }

        return [state, setState] as const;
    };
}
