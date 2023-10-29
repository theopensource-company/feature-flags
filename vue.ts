import { onUnmounted, shallowRef } from "npm:vue";
import { FeatureFlags, type TFeatureFlags, type AnyFeatureFlags } from "./mod.ts";

export function featureFlagsHookFactory<T extends AnyFeatureFlags>(
    featureFlags: T,
) {
    return () => {
        type Schema = typeof featureFlags["schema"];
        const state = shallowRef<Schema>({ ...featureFlags.store });

        const setState = (
            updates: Partial<TFeatureFlags<Schema>>,
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
