const REDUX_SELECTOR_ACTION = '@@redux_selector_action';
const PLACEHOLDER = `${REDUX_SELECTOR_ACTION}/placeholder`;

/**
 * A selector function which returns the "placeholder" function.
 * This function is a special selector, once used as a dependency of an action creator's argument, the position of that dependency will be saved.
 * It will be filled by its position, once the selector action is called with arguments.
 *
 * @param {array} [selectorObj] Object that maps props to selectors
 * @returns {function} placeholder function
 */
export const getPlaceholder = selectorObj => {
    if (selectorObj !== undefined && !isNotNullObject(selectorObj)) {
        throw new TypeError('Placeholder for object arg should be of type object and not null, ' +
            `instead received the following type: [${typeof selectorObj}]`);
    }

    return {
        selectorObj,
        placeholder: PLACEHOLDER,
    };
};

/**
 * A middleware which handles the in-package action.
 * That action contains, inside the payload part, an inner action creator, which will be dispatched with its given args,
 * after injecting selectors' output that are calculated against the store.
 * Otherwise calls next middleware and return its output.
 *
 * @param {object} store - The redux store API
 * @returns {function} - A callback which is called with the next middleware
 */
export function reduxSelectorActionMiddleware(store) {
    return next => action => {
        const {type, payload, meta} = action;
		
        if (type === REDUX_SELECTOR_ACTION) {
            throwIfNotFunction(payload);
            const {selectors, args} = meta;
            const state = store.getState();
            const computedSelectors = selectors.map(selector => {
                if (isExtendableSelector(selector)) {
                    selector.selectorObj = Object.keys(selector.selectorObj).reduce((acc, key) => {
                        acc[key] = calculateSelector(selector.selectorObj[key], state);
                        return acc;
                    }, {});
                    return selector;
                }

                return calculateSelector(selector, state);
            });
            const actionCreator = partial(payload, ...computedSelectors);
            store.dispatch(actionCreator(...args));
        } else {
            return next(action);
        }
    }
}

/**
 * Accepts an action creator and selectors which we want to inject as dependencies of the action creator.
 * A dependency can be a selector function, which its output will be passed or any other value.
 * Supports the following formats:
 * 1. createSelectorAction(dep1, dep2, ..., actionCreator)
 * 2. createSelectorAction([dep1, dep2, ...], actionCreator)
 * Returns a new action creator which we can dispatch with redux store.dispatch.
 * The new action creator can be tested using its new props resultFunc, dependencies.
 * resultFunc = the given action creator function
 * dependencies = the given selectors as an array
 *
 * @param  {...function} funcs - selectors and action creator
 * @returns {function} selector action
 */
export function createSelectorAction(...funcs) {
    const actionCreator = funcs.pop();
    const selectors = Array.isArray(funcs[0]) ? funcs[0] : funcs;
    throwIfNotFunction(actionCreator);

    const actionSelector = (...args) => ({
        type: REDUX_SELECTOR_ACTION,
        payload: actionCreator,
        meta: {
            selectors,
            args,
        },
    });

    actionSelector.resultFunc = actionCreator;
    actionSelector.dependencies = selectors;
    return actionSelector;
}

/**
 * Returns new function which is partially applied.
 * Meaning part of the args will be bound to the function and the function won't accept them anymore, in order to reduce its arguments.
 * In case we get a bound arg which is the "placeholder", we inject to the new function one of the args which where applied,
 * instead of the placeholder, by their position.
 *
 * @param {function} func - Function to bind its args
 * @param {array} boundArgs - The arguments we want to bind to the given function
 * @returns {function} - partial function
 */
function partial(func, ...boundArgs) {
    return (...args) => {
        let argIndex = 0;
        const newArgs = boundArgs
            .map(arg => {
                let calculatedArg = arg;
                if (isExtendableSelector(arg)) {
                    calculatedArg = {...arg.selectorObj, ...args[argIndex++]};
                } else if (isPlaceholder(arg)) {
                    calculatedArg = args[argIndex++];
                }
                return calculatedArg;
            })
            .concat(args.slice(argIndex));
        return func(...newArgs);
    }
}

/**
 * Returns whether the given arg is a function.
 *
 * @param {*} func - A potential function
 * @returns {boolean} - Whether is function
 */
function isFunction(func) {
    return typeof func === 'function';
}

/**
 * Returns whether the given arg is an object and not null.
 *
 * @param {*} obj - A potential object
 * @returns {boolean} - Whether is an object
 */
function isNotNullObject(obj) {
    return typeof obj === 'object' && Boolean(obj);
}

/**
 * Returns whether the given arg is a placeholder selector.
 *
 * @param {*} arg - A potential placeholder
 * @returns {boolean} - Whether is a placeholder
 */
function isPlaceholder(arg) {
    return arg === getPlaceholder || isNotNullObject(arg) && arg.placeholder === PLACEHOLDER;
}

/**
 * Returns whether the given arg is an extendable selector, meaning an object of keys to selectors.
 *
 * @param {*} arg - A potential object
 * @returns {boolean} - Whether is an object
 */
function isExtendableSelector(arg) {
    return isPlaceholder(arg) && Boolean(arg.selectorObj);
}

/**
 * Calculate the selector output against the given state
 *
 * @param {function} selector A selector to execute
 * @param {object} state A state to pass to the selector as arg
 * @returns {*} The output of the selector after calculation
 */
function calculateSelector(selector, state) {
    if (selector === getPlaceholder) {
        return selector();
    }
    return isFunction(selector) ? selector(state) : selector;
}

/**
 * Throws an error if the given arg is not a function, otherwise continue.
 *
 * @param {function} func - The function to verify
 * @returns {undefined}
 * @throws TypeError
 */
function throwIfNotFunction(func) {
    if (!isFunction(func)) {
        throw new TypeError('Selector actions should be based on action creator of type function, ' +
            `instead received the following type: [${typeof func}]`);
    }
}