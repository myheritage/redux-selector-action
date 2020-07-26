
const REDUX_ACTION_SELECTOR = '@@redux_action_selector';
const PLACEHOLDER = `${REDUX_ACTION_SELECTOR}/placeholder`;

export const getPlaceholder = () => PLACEHOLDER;

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

function partial(func, ...boundArgs) {
    return function(...args) {
        let argIndex = 0;
        const newArgs = boundArgs
            .map(arg => arg === PLACEHOLDER ? args[argIndex++] : arg)
            .concat(args.slice(argIndex));
        return func(...newArgs);
    }
}

function isFunction(func) {
    return typeof func === 'function';
}

function throwIfNotFunction(func) {
    if (!isFunction(func)) {
        throw new TypeError('Action selectors should be based on action creator of type function, ' +
            `instead received the following type: [${typeof func}]`);
    }
}