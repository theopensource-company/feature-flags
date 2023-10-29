export class FeatureFlags<
    Environment extends string,
    Schema extends FeatureFlagSchema,
> {
    private subscriptions: Subscription<Schema>[] = [];
    public readonly schema: Schema;
    public readonly initialStore: TFeatureFlags<Schema>;
    private _store: TFeatureFlags<Schema>;

    constructor({
        schema,
        environment,
        defaults: defaultsInput,
        overrides,
        subscription,
    }: {
        schema: Schema;
        environment?: Environment;
        defaults?: FeatureFlagDefaults<Environment | string, Schema>;
        overrides?: Overrides<Schema>;
        subscription?: Subscription<Schema>;
    }) {
        if (defaultsInput && !environment) {
            throw new Error("Got defaults but no environment");
        }
        const defaults =
            defaultsInput && environment && environment in defaultsInput
                ? defaultsInput[environment]
                : undefined;
        this.schema = schema;
        this._store = new Proxy(
            FeatureFlags.computeStore({ schema, defaults, overrides }),
            {
                set: (store, flag, value) => {
                    if (typeof flag !== "string") return false;

                    const valid = value === FeatureFlags.computeValue({
                        schema: this.schema,
                        flag,
                        current: flag in store
                            ? store[flag as keyof typeof store]
                            : undefined,
                        manual: value,
                    });

                    if (!valid) return false;
                    const success = Reflect.set(store, flag, value);
                    if (success) this.subscriptions.map((f) => f(flag, value));
                    return success;
                },
            },
        );

        this.initialStore = { ...this._store };
        if (subscription) this.subscriptions.push(subscription);
    }

    subscribe(subscription: Subscription<Schema>) {
        this.subscriptions.push(subscription);
        return true;
    }

    unsubscribe(subscription: Subscription<Schema>) {
        const index = this.subscriptions.indexOf(subscription);
        if (index) this.subscriptions.splice(index, 1);
        return !!index;
    }

    get store() {
        return this._store;
    }

    get(flag: FeatureFlag<Schema>) {
        return this._store[flag];
    }

    set<Flag extends FeatureFlag<Schema>>(
        flag: Flag,
        value: FeatureFlagOption<Schema, Flag>,
    ) {
        this._store[flag] = value;
        return true;
    }

    static computeStore<Schema extends FeatureFlagSchema>({
        schema,
        defaults,
        overrides,
    }: {
        schema: Schema;
        defaults?: Partial<TFeatureFlags<Schema>>;
        overrides?: Overrides<Schema>;
    }) {
        const options = FeatureFlags.listOptionsFromSchema(schema);

        return options.reduce((prev, flag) => ({
            ...prev,
            [flag]: FeatureFlags.computeValue({
                schema,
                defaults,
                overrides,
                flag,
            }),
        }), {} as TFeatureFlags<Schema>);
    }

    static computeValue<
        Schema extends FeatureFlagSchema,
        Flag extends FeatureFlag<Schema>,
    >({
        schema,
        flag,
        overrides,
        defaults,
        current: vCurrent,
        manual,
    }: {
        schema: Schema;
        flag: Flag;
        defaults?: Partial<TFeatureFlags<Schema>>;
        overrides?: Overrides<Schema>;
        current?: FeatureFlagValue;
        manual?: FeatureFlagValue;
    }): FeatureFlagValue {
        const v = (v: unknown) =>
            schema[flag].options.includes(v as FeatureFlagValue)
                ? v as FeatureFlagValue
                : undefined;
        const vSchema = schema[flag].options[0];
        const vDefault = v(defaults?.[flag]);
        const vOverride = v(
            FeatureFlags.computeOverride({ schema, flag, overrides }),
        );
        const vManual = v(!schema[flag].readonly ? manual : undefined);

        return vManual ?? vOverride ?? vDefault ?? vCurrent ?? vSchema;
    }

    static computeOverride<
        Schema extends FeatureFlagSchema,
        Flag extends FeatureFlag<Schema>,
    >({
        schema,
        flag,
        overrides,
    }: {
        schema: Schema;
        flag: Flag;
        overrides?: Overrides<Schema>;
    }): FeatureFlagValue | undefined {
        if (schema[flag].readonly) return undefined;

        const value = overrides?.(flag);
        if (!FeatureFlags.isValidValue(value)) return undefined;

        return value;
    }

    static listOptionsFromSchema<Schema extends FeatureFlagSchema>(
        schema: Schema,
    ) {
        return Object.keys(schema) as FeatureFlag<Schema>[];
    }

    static isValidValue(v: unknown): v is FeatureFlagValue {
        return ["string", "number", "boolean"].includes(typeof v);
    }

    static createOptions<
        Environment extends string,
        Schema extends FeatureFlagSchema,
    >({
        schema,
        defaults,
    }: {
        schema: Schema;
        defaults?: FeatureFlagDefaults<Environment | string, Schema>;
    }) {
        return { schema, defaults };
    }
}

/////////////////////////////////////
/////////////   TYPES   /////////////
/////////////////////////////////////

export type FeatureFlagValue = boolean | number | string;
export type FeatureFlagSchema = Record<
    string,
    {
        readonly?: boolean;
        options: readonly [FeatureFlagValue, ...FeatureFlagValue[]];
    }
>;

export type TFeatureFlags<Schema extends FeatureFlagSchema> = {
    -readonly [T in FeatureFlag<Schema>]: FeatureFlagOption<Schema, T>;
};

export type FeatureFlagDefaults<
    Environment extends string,
    Schema extends FeatureFlagSchema,
> = Partial<
    Record<
        Environment,
        Partial<TFeatureFlags<Schema>>
    >
>;

export type FeatureFlag<T extends FeatureFlagSchema> = keyof T;
export type FeatureFlagOption<
    Schema extends FeatureFlagSchema,
    Flag extends FeatureFlag<Schema>,
> = Schema[Flag]["options"][number];

export type Overrides<Schema extends FeatureFlagSchema> = <
    T extends FeatureFlag<Schema>,
>(
    flag: T,
) => FeatureFlagValue | void;
export type Subscription<Schema extends FeatureFlagSchema> = <
    T extends FeatureFlag<Schema>,
>(flag: T, value: FeatureFlagOption<Schema, T>) => unknown | Promise<unknown>;

// deno-lint-ignore no-explicit-any
export type AnyFeatureFlags = FeatureFlags<any, any>;