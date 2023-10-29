import { onUnmounted, shallowRef } from "npm:vue";
import { FeatureFlags, TFeatureFlags } from "./mod.ts";

// deno-lint-ignore no-explicit-any
type AnyFeatureFlags = FeatureFlags<any, any>;

export function featureFlagsHookFactory<T extends AnyFeatureFlags>(
    featureFlags: T,
) {
    return () => {
        const state = shallowRef({ ...featureFlags.store });

        const setState = (
            updates: Partial<TFeatureFlags<(typeof featureFlags)["schema"]>>,
        ) => {
            const flags = Object.keys(updates) as (keyof typeof updates)[];
            flags.forEach((flag) => {
                const v = updates[flag];
                if (FeatureFlags.isValidValue(v)) {
                    featureFlags.set(flag, v);
                }
            });
        };

        const listener = () => state.value = { ...featureFlags.store };
        featureFlags.subscribe(listener);
        onUnmounted(() => featureFlags.unsubscribe(listener));

        return [state, setState] as const;
    };
}
