const REDUX_ACTION_SELECTOR = '@@redux_action_selector';
const PLACEHOLDER = `${REDUX_ACTION_SELECTOR}/placeholder`;

/**
 * A selector function which returns the "placeholder" constant
 *
 * @returns {string} "placeholder" value
 */
export const getPlaceholder = () => PLACEHOLDER;

/**
 * A middleware which handles any action from type "redux-action-selector" in order to inject the store selectors output,
 * to the given action creator inside the handled action payload.
 * Afterwards, the middleware dispatch the new action with its injected args without passing them, but to calculate them against the store.
 * Otherwise calls next middleware and return its output.
 *
 * @param {object} store - The redux store API
 * @returns {function} - A callback which is called with the next middleware
 */
export function reduxActionSelectorMiddleware(store) {
    return next => action => {
        const {type, payload, meta} = action;
		
        if (type === REDUX_ACTION_SELECTOR) {
            throwIfNotFunction(payload);
            const {selectors, args} = meta;
            const state = store.getState();
            const computedSelectors = selectors.map(selector => isFunction(selector) ? selector(state) : selector);
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
 * 1. createActionSelector(dep1, dep2, ..., actionCreator)
 * 2. createActionSelector([dep1, dep2, ...], actionCreator)
 * Returns a new action creator which we can dispatch with redux store.dispatch.
 * The new action creator can be tested using its new props resultFunc, dependencies.
 * resultFunc = the given action creator function
 * dependencies = the given selectors as an array
 *
 * We can use a special selector as a dependency, called getPlaceholder, for supporting args of the returned action creator.
 * Each getPlaceholder saves the argument position for another outer argument.
 * Once we dispatch the new action, its args will fill all the placeholders by their position order.
 *
 * @param  {...function} funcs - selectors and action creator
 * @returns {function} action selector
 */
export function createActionSelector(...funcs) {
    const actionCreator = funcs.pop();
    const selectors = Array.isArray(funcs[0]) ? funcs[0] : funcs;
    throwIfNotFunction(actionCreator);

    const actionSelector = (...args) => ({
        type: REDUX_ACTION_SELECTOR,
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
            .map(arg => arg === PLACEHOLDER ? args[argIndex++] : arg)
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
 * Throws an error if the given arg is not a function, otherwise continue.
 *
 * @param {function} func - The function to verify
 * @returns {undefined}
 * @throws TypeError
 */
function throwIfNotFunction(func) {
    if (!isFunction(func)) {
        throw new TypeError('Action selectors should be based on action creator of type function, ' +
            `instead received the following type: [${typeof func}]`);
    }
}