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
type AnyFeatureFlags = FeatureFlags<any, any>;
type State<T extends AnyFeatureFlags> = [
    TFeatureFlags<T["schema"]>,
    (updates: Partial<TFeatureFlags<T["schema"]>>) => void,
];

type ContextContent<T extends AnyFeatureFlags> = {
    featureFlags: T;
    state: State<T>;
};

export const FeatureFlagContext = createContext<
    ContextContent<AnyFeatureFlags>
>({
    featureFlags: new FeatureFlags({ schema: {} }),
    state: [{}, () => {}],
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

    const jsonState = useSyncExternalStore<string>(
        (listener) => {
            featureFlags.subscribe(listener);
            return () => featureFlags.unsubscribe(listener);
        },
        () => JSON.stringify(featureFlags.store),
        () => JSON.stringify(featureFlags.initialStore),
    );

    const state = JSON.parse(jsonState) as TFeatureFlags<
        typeof featureFlags["schema"]
    >;

    function setState(
        updates: Partial<TFeatureFlags<typeof featureFlags["schema"]>>,
    ) {
        const flags = Object.keys(updates) as (keyof typeof updates)[];
        flags.forEach((flag) => {
            const v = updates[flag];
            if (FeatureFlags.isValidValue(v)) {
                featureFlags.set(flag, v);
            }
        });
    }

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

    return createElement(
        FeatureFlagContext.Provider,
        {
            value: {
                featureFlags,
                state: [state, setState] as State<typeof featureFlags>,
            },
        },
        children,
    );
}

export function featureFlagsHookFactory<T extends AnyFeatureFlags>(
    _: T,
) {
    return () => {
        const { state } = useContext(FeatureFlagContext) as ContextContent<T>;
        return state;
    };
}
